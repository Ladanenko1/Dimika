from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=4, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    id: int
    login: str
    is_admin: bool

    model_config = {"from_attributes": True}
