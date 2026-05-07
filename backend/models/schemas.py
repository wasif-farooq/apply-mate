from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class UserCreate(UserBase):
    google_id: str
    refresh_token: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class UserWithToken(UserResponse):
    token: str


class UserSettingsBase(BaseModel):
    selected_model: Optional[str] = None
    selected_provider: Optional[str] = None
    resume_path: Optional[str] = None


class UserSettingsResponse(UserSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class ProviderConfigBase(BaseModel):
    provider: str
    enabled: bool = True
    config: dict = {}


class ProviderConfigResponse(ProviderConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ProviderModelBase(BaseModel):
    model_name: str
    is_default: bool = False


class ProviderModelResponse(ProviderModelBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SettingsResponse(BaseModel):
    providers: list[ProviderConfigResponse]
    models: dict[str, list[ProviderModelBase]]
    selected_model: Optional[str]
    selected_provider: Optional[str]


class ProviderConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    config: Optional[dict] = None


class ProviderModelsUpdate(BaseModel):
    models: list[dict]


class ModelSelectionUpdate(BaseModel):
    model: str
    provider: str


class GoogleUserInfo(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None