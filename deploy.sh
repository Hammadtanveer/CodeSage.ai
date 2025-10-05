#!/bin/bash

# CodeSage One-Click Deployment Script
# This script provides a reliable deployment process for the CodeSage application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker installation and status..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    print_success "Docker is running"
}

# Check if Docker Compose is available
check_docker_compose() {
    print_status "Checking Docker Compose..."

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi

    print_success "Docker Compose is available"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    mkdir -p ./data/redis
    mkdir -p ./data/postgres
    mkdir -p ./logs

    print_success "Directories created"
}

# Check environment variables
check_environment() {
    print_status "Checking environment configuration..."

    if [ ! -f ./api/.env ]; then
        print_warning "api/.env file not found. Creating from template..."
        cp ./api/.env.example ./api/.env
        print_warning "Please edit ./api/.env file with your actual values before running the application."
        print_warning "Required: CEREBRAS_API_KEY"
        print_warning "Optional: DB_PASSWORD, ALLOWED_ORIGINS, RATE_LIMIT, MAX_FILE_BYTES"
    fi

    # Check for required API key (Cerebras keys start with csk-)
    if ! grep -q "CEREBRAS_API_KEY=csk-" ./api/.env 2>/dev/null; then
        print_error "CEREBRAS_API_KEY not properly configured in ./api/.env"
        print_error "Please set your Cerebras API key in ./api/.env file"
        print_error "Cerebras API keys start with 'csk-' (not 'sk-')"
        exit 1
    fi

    print_success "Environment configuration looks good"
}

# Clean up previous deployment
cleanup() {
    print_status "Cleaning up previous deployment..."

    # Stop and remove existing containers
    docker-compose down --volumes --remove-orphans 2>/dev/null || true

    # Clean up dangling images
    docker image prune -f 2>/dev/null || true

    print_success "Cleanup completed"
}

# Build and start services
deploy() {
    print_status "Building and starting CodeSage services..."

    # Build with no cache to ensure fresh builds
    docker-compose build --no-cache

    print_status "Starting services..."
    docker-compose up -d

    print_success "Services started successfully"
}

# Wait for services to be healthy
wait_for_healthy() {
    print_status "Waiting for services to become healthy..."

    # Wait for API to be healthy
    print_status "Waiting for API service..."
    timeout=120
    elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:5000/api/health &>/dev/null; then
            print_success "API service is healthy"
            break
        fi

        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ $elapsed -ge $timeout ]; then
        print_warning "API service health check timed out, but continuing..."
    fi

    # Wait for UI to be healthy
    print_status "Waiting for UI service..."
    timeout=60
    elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost/ &>/dev/null; then
            print_success "UI service is healthy"
            break
        fi

        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done

    if [ $elapsed -ge $timeout ]; then
        print_warning "UI service health check timed out, but continuing..."
    fi
}

# Show status and information
show_status() {
    print_status "Deployment completed! Here's the status:"

    echo ""
    echo -e "${BLUE}=== CodeSage Deployment Status ===${NC}"
    docker-compose ps

    echo ""
    echo -e "${GREEN}=== Access Information ===${NC}"
    echo "🌐 UI: http://localhost"
    echo "🔗 API: http://localhost:5000"
    echo "📊 Health: http://localhost:5000/api/health"
    echo "📈 Metrics: http://localhost:5000/api/metrics"

    if docker-compose ps | grep -q postgres; then
        echo "🗄️  Database: postgresql://codesage:codesage@localhost:5432/codesage"
    fi

    if docker-compose ps | grep -q redis; then
        echo "⚡ Redis: localhost:6379"
    fi

    echo ""
    echo -e "${YELLOW}=== Useful Commands ===${NC}"
    echo "View logs: docker-compose logs -f [service-name]"
    echo "Stop all: docker-compose down"
    echo "Restart: docker-compose restart"
    echo "Update: ./deploy.sh --update"

    echo ""
    print_success "CodeSage is ready for demo day! 🎉"
}

# Main deployment function
main() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════╗"
    echo "║       CodeSage Deployment Script     ║"
    echo "║         One-Click Demo Setup        ║"
    echo "╚══════════════════════════════════════╝"
    echo -e "${NC}"

    check_docker
    check_docker_compose
    create_directories
    check_environment
    cleanup
    deploy
    wait_for_healthy
    show_status
}

# Handle command line arguments
case "${1:-}" in
    "--update")
        print_status "Updating existing deployment..."
        docker-compose build
        docker-compose up -d
        show_status
        ;;
    "--logs")
        print_status "Showing logs for all services..."
        docker-compose logs -f
        ;;
    "--status")
        print_status "Current deployment status:"
        docker-compose ps
        ;;
    "--cleanup")
        print_status "Cleaning up deployment..."
        docker-compose down --volumes --remove-orphans
        docker image prune -f
        print_success "Cleanup completed"
        ;;
    "--help"|"-h"|"")
        echo "CodeSage Deployment Script"
        echo ""
        echo "Usage: $0 [OPTION]"
        echo ""
        echo "Options:"
        echo "  --update    Update existing deployment"
        echo "  --logs      Show logs for all services"
        echo "  --status    Show current deployment status"
        echo "  --cleanup   Clean up deployment and volumes"
        echo "  --help      Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0              # Deploy CodeSage"
        echo "  $0 --update     # Update existing deployment"
        echo "  $0 --logs       # View logs"
        echo "  $0 --cleanup    # Remove everything"
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

# Run main deployment if no arguments provided
if [ -z "$1" ]; then
    main
fi
