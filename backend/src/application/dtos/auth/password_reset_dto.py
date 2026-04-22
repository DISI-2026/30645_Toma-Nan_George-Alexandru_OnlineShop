from pydantic import BaseModel, ConfigDict, Field


class ForgotPasswordRequestDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


class ForgotPasswordResponseDTO(BaseModel):
    message: str


class ResetPasswordRequestDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=1, max_length=255)


class ResetPasswordResponseDTO(BaseModel):
    message: str
