from pydantic import BaseModel, ConfigDict, Field


class LoginRequestDTO(BaseModel):
    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    password: str = Field(min_length=1, max_length=255)


class LoggedInUserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str


class LoginResultDTO(BaseModel):
    access_token: str
    user: LoggedInUserDTO


class LoginResponseDTO(BaseModel):
    user: LoggedInUserDTO
