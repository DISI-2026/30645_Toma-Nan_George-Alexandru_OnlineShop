from fastapi import APIRouter

from api.endpoints.auth import router as auth_router
from api.endpoints.buyers import router as buyers_router
from api.endpoints.categories import router as categories_router
from api.endpoints.me import router as me_router
from api.endpoints.orders import router as orders_router
from api.endpoints.products import router as products_router
from api.endpoints.sellers import router as sellers_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(buyers_router)
api_router.include_router(categories_router)
api_router.include_router(me_router)
api_router.include_router(orders_router)
api_router.include_router(products_router)
api_router.include_router(sellers_router)

