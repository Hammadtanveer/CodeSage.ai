from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # User preferences
    theme = db.Column(db.String(20), default='auto')  # light, dark, auto
    preferred_language = db.Column(db.String(50), default='en')

    # Analytics data
    total_analyses = db.Column(db.Integer, default=0)
    total_files_analyzed = db.Column(db.Integer, default=0)
    total_lines_analyzed = db.Column(db.Integer, default=0)

    # Relationships
    analyses = db.relationship('Analysis', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat(),
            'last_activity': self.last_activity.isoformat(),
            'theme': self.theme,
            'preferred_language': self.preferred_language,
            'total_analyses': self.total_analyses,
            'total_files_analyzed': self.total_files_analyzed,
            'total_lines_analyzed': self.total_lines_analyzed
        }

class Analysis(db.Model):
    __tablename__ = 'analyses'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    request_id = db.Column(db.String(255), unique=True, nullable=False)

    # Request details
    input_mode = db.Column(db.String(20), nullable=False)  # github, code, repository
    analysis_mode = db.Column(db.String(20), nullable=False)  # bugs, improvements, etc.
    file_count = db.Column(db.Integer, default=1)

    # Content metadata
    total_files = db.Column(db.Integer, default=0)
    total_lines = db.Column(db.Integer, default=0)
    languages = db.Column(db.Text)  # JSON array of languages detected
    repository_url = db.Column(db.Text)
    file_paths = db.Column(db.Text)  # JSON array of file paths

    # Performance metrics
    processing_time_ms = db.Column(db.Integer)
    ai_response_time_ms = db.Column(db.Integer)
    cache_hit = db.Column(db.Boolean, default=False)

    # Results
    response_length = db.Column(db.Integer, default=0)
    error_occurred = db.Column(db.Boolean, default=False)
    error_message = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'request_id': self.request_id,
            'input_mode': self.input_mode,
            'analysis_mode': self.analysis_mode,
            'file_count': self.file_count,
            'total_files': self.total_files,
            'total_lines': self.total_lines,
            'languages': json.loads(self.languages) if self.languages else [],
            'repository_url': self.repository_url,
            'file_paths': json.loads(self.file_paths) if self.file_paths else [],
            'processing_time_ms': self.processing_time_ms,
            'ai_response_time_ms': self.ai_response_time_ms,
            'cache_hit': self.cache_hit,
            'response_length': self.response_length,
            'error_occurred': self.error_occurred,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class AnalyticsSnapshot(db.Model):
    __tablename__ = 'analytics_snapshots'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # System metrics
    total_users = db.Column(db.Integer, default=0)
    total_analyses = db.Column(db.Integer, default=0)
    total_files_analyzed = db.Column(db.Integer, default=0)
    total_lines_analyzed = db.Column(db.Integer, default=0)

    # Performance metrics
    avg_response_time_ms = db.Column(db.Float, default=0)
    error_rate_percent = db.Column(db.Float, default=0)
    cache_hit_rate_percent = db.Column(db.Float, default=0)

    # Popular features
    popular_input_modes = db.Column(db.Text)  # JSON
    popular_analysis_modes = db.Column(db.Text)  # JSON
    popular_languages = db.Column(db.Text)  # JSON

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'total_users': self.total_users,
            'total_analyses': self.total_analyses,
            'total_files_analyzed': self.total_files_analyzed,
            'total_lines_analyzed': self.total_lines_analyzed,
            'avg_response_time_ms': self.avg_response_time_ms,
            'error_rate_percent': self.error_rate_percent,
            'cache_hit_rate_percent': self.cache_hit_rate_percent,
            'popular_input_modes': json.loads(self.popular_input_modes) if self.popular_input_modes else {},
            'popular_analysis_modes': json.loads(self.popular_analysis_modes) if self.popular_analysis_modes else {},
            'popular_languages': json.loads(self.popular_languages) if self.popular_languages else {}
        }
