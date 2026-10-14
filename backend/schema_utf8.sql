CREATE TYPE user_role AS ENUM ('admin', 'viewer');
CREATE TYPE risklevel AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE alerttype AS ENUM ('EMERGING_TREND', 'SENTIMENT_SHIFT', 'BRAND_RISK', 'MENTION_SPIKE', 'CROSS_PLATFORM_SPREAD');
CREATE TYPE alertseverity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE platformenum AS ENUM ('reddit', 'x', 'news', 'youtube', 'web', 'tiktok', 'bluesky', 'news_api', 'gdelt');

CREATE TABLE users (
	email VARCHAR(255) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	full_name VARCHAR(255) NOT NULL, 
	role user_role DEFAULT 'viewer' NOT NULL, 
	is_active BOOLEAN DEFAULT 'true' NOT NULL, 
	interests JSON, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id)
)

;
CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE brands (
	name VARCHAR(255) NOT NULL, 
	aliases JSON, 
	keywords JSON, 
	monitoring_enabled BOOLEAN NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
)

;

CREATE TABLE countries (
	iso_code VARCHAR(2) NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (iso_code)
)

;

CREATE TABLE entities (
	name VARCHAR(255) NOT NULL, 
	entity_type VARCHAR(50) NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
)

;

CREATE TABLE sources (
	name VARCHAR(255) NOT NULL, 
	source_type VARCHAR(50) NOT NULL, 
	url VARCHAR(2048), 
	is_active BOOLEAN NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
)

;

CREATE TABLE refresh_tokens (
	user_id UUID NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	revoked_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	id UUID NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
)

;
CREATE UNIQUE INDEX ix_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX ix_refresh_tokens_expires_at ON refresh_tokens (expires_at);

CREATE TABLE risk_assessments (
	brand_id UUID NOT NULL, 
	timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	risk_score FLOAT NOT NULL, 
	risk_level risklevel NOT NULL, 
	drivers JSON, 
	negative_mentions_pct FLOAT NOT NULL, 
	mention_growth_rate FLOAT NOT NULL, 
	platforms_affected INTEGER NOT NULL, 
	complaint_clusters JSON, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE CASCADE
)

;

CREATE TABLE topics (
	name VARCHAR(255) NOT NULL, 
	description VARCHAR(1000), 
	keywords JSON, 
	brand_id UUID, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name), 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL
)

;

CREATE TABLE content_items (
	source_id UUID, 
	source VARCHAR(255), 
	source_type VARCHAR(50), 
	title TEXT, 
	description TEXT, 
	url VARCHAR(2048), 
	published_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	country_name VARCHAR(255), 
	country_id UUID, 
	language VARCHAR(10), 
	category VARCHAR(100), 
	author VARCHAR(255), 
	image_url VARCHAR(2048), 
	engagement INTEGER NOT NULL, 
	sentiment FLOAT NOT NULL, 
	sentiment_label VARCHAR(16) NOT NULL, 
	entities_json JSON, 
	topics_json JSON, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE SET NULL, 
	FOREIGN KEY(country_id) REFERENCES countries (id) ON DELETE SET NULL
)

;
CREATE INDEX ix_content_items_language ON content_items (language);
CREATE INDEX ix_content_items_published_at ON content_items (published_at);
CREATE INDEX ix_content_items_country_id ON content_items (country_id);
CREATE UNIQUE INDEX ix_content_items_url ON content_items (url);
CREATE INDEX ix_content_items_category ON content_items (category);
CREATE INDEX ix_content_items_source_id ON content_items (source_id);
CREATE INDEX ix_content_items_country_name ON content_items (country_name);
CREATE INDEX ix_content_items_source ON content_items (source);
CREATE INDEX ix_content_items_source_type ON content_items (source_type);

CREATE TABLE propagation_events (
	topic_id UUID NOT NULL, 
	platform VARCHAR(32) NOT NULL, 
	first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	sequence_order INTEGER NOT NULL, 
	mentions_at_detection INTEGER NOT NULL, 
	growth_since_entry_pct FLOAT NOT NULL, 
	id UUID NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_propagation_topic_platform UNIQUE (topic_id, platform), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE
)

;

CREATE TABLE alerts (
	alert_type alerttype NOT NULL, 
	severity alertseverity NOT NULL, 
	topic_id UUID, 
	brand_id UUID, 
	message VARCHAR(500) NOT NULL, 
	drivers JSON, 
	threshold_value FLOAT, 
	observed_value FLOAT, 
	acknowledged BOOLEAN NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE, 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE CASCADE
)

;

CREATE TABLE events (
	topic_id UUID NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	description VARCHAR(1000), 
	first_seen TIMESTAMP WITH TIME ZONE NOT NULL, 
	latest_seen TIMESTAMP WITH TIME ZONE NOT NULL, 
	article_count INTEGER NOT NULL, 
	source_count INTEGER NOT NULL, 
	countries JSON, 
	event_velocity FLOAT NOT NULL, 
	related_entities JSON, 
	related_topics JSON, 
	sentiment FLOAT NOT NULL, 
	timeline JSON, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE
)

;

CREATE TABLE trend_snapshots (
	topic_id UUID NOT NULL, 
	timestamp TIMESTAMP WITH TIME ZONE NOT NULL, 
	volume_last_hour INTEGER NOT NULL, 
	baseline_volume FLOAT NOT NULL, 
	sentiment_avg FLOAT NOT NULL, 
	positive_pct FLOAT NOT NULL, 
	negative_pct FLOAT NOT NULL, 
	neutral_pct FLOAT NOT NULL, 
	growth_rate FLOAT NOT NULL, 
	acceleration FLOAT NOT NULL, 
	cross_platform_count INTEGER NOT NULL, 
	trend_score FLOAT NOT NULL, 
	score_breakdown JSON, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE
)

;

CREATE TABLE ai_insights (
	topic_id UUID NOT NULL, 
	kind VARCHAR(32) NOT NULL, 
	summary_text VARCHAR NOT NULL, 
	key_drivers JSON, 
	evidence JSON, 
	generated_by VARCHAR(32) NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE
)

;

CREATE TABLE sentiment_snapshots (
	topic_id UUID, 
	timestamp TIMESTAMP WITH TIME ZONE NOT NULL, 
	sentiment_avg FLOAT NOT NULL, 
	positive_volume INTEGER NOT NULL, 
	neutral_volume INTEGER NOT NULL, 
	negative_volume INTEGER NOT NULL, 
	total_volume INTEGER NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE
)

;

CREATE TABLE mentions (
	topic_id UUID NOT NULL, 
	brand_id UUID, 
	event_id UUID, 
	platform platformenum NOT NULL, 
	external_id VARCHAR(255), 
	author VARCHAR(255), 
	content VARCHAR(2000), 
	url VARCHAR(2048), 
	country_id UUID, 
	sentiment_score FLOAT NOT NULL, 
	sentiment_label VARCHAR(16) NOT NULL, 
	engagement_count INTEGER NOT NULL, 
	keywords JSON, 
	posted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	collected_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	source_is_demo BOOLEAN NOT NULL, 
	id UUID NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE, 
	FOREIGN KEY(brand_id) REFERENCES brands (id) ON DELETE SET NULL, 
	FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE SET NULL, 
	FOREIGN KEY(country_id) REFERENCES countries (id) ON DELETE SET NULL
)

;

CREATE TABLE topic_mentions (
	topic_id UUID NOT NULL, 
	mention_id UUID NOT NULL, 
	id UUID NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(topic_id) REFERENCES topics (id) ON DELETE CASCADE, 
	FOREIGN KEY(mention_id) REFERENCES mentions (id) ON DELETE CASCADE
)

;
