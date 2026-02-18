from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.models.user import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters, maximum 128 characters")
    full_name: str = Field(min_length=2)
    role: UserRole = UserRole.PATIENT
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        Validate password requirements.
        
        Ensures password is between 8-128 characters to work with bcrypt's
        72-byte limit after SHA256 pre-hashing.
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password cannot exceed 128 characters')
        
        # Optional: Add more password strength requirements
        # Uncomment if you want stricter password rules
        # if not any(c.isupper() for c in v):
        #     raise ValueError('Password must contain at least one uppercase letter')
        # if not any(c.islower() for c in v):
        #     raise ValueError('Password must contain at least one lowercase letter')
        # if not any(c.isdigit() for c in v):
        #     raise ValueError('Password must contain at least one digit')
        
        return v
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        """Validate full name is not empty or just whitespace."""
        if not v or not v.strip():
            raise ValueError('Full name cannot be empty')
        return v.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters, maximum 128 characters")
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """
        Validate new password requirements.
        
        Ensures password is between 8-128 characters to work with bcrypt's
        72-byte limit after SHA256 pre-hashing.
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password cannot exceed 128 characters')
        return v