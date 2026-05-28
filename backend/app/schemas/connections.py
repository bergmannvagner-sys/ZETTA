from pydantic import BaseModel

from app.models.user import UserRole


class MyConnectionCodeResponse(BaseModel):
    connection_code: str


class ConnectionSearchResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    status: str
    connection_code: str
