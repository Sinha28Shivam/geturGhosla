from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Room Discovery API"
    SECRET_KEY: str
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Admin@123"

    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "room_db"
    
    # Email SMTP Settings (Gmail Defaults)
    SMTP_USERNAME: str = "noreply@roomdiscovery.com"
    SMTP_PASSWORD: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False

    # Redis & Security Settings
    REDIS_URL: str = "redis://localhost:6379/0"

    # Cloudinary Presigned Signature Settings
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Azure Application Insights Telemetry
    APPLICATIONINSIGHTS_CONNECTION_STRING: str = ""

    DATABASE_URL_OVERRIDE: str = ""

    @property
    def DATABASE_URL(self) -> str:
        if self.DATABASE_URL_OVERRIDE:
            return self.DATABASE_URL_OVERRIDE
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"

settings = Settings()
    
