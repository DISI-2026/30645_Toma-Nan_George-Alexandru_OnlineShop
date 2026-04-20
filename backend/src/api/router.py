from fastapi import APIRouter

from api.endpoints.auth import router as auth_router
from api.endpoints.me import router as me_router
from api.endpoints.sellers import router as sellers_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(me_router)
api_router.include_router(sellers_router)

