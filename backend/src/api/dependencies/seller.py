from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import AuthContext, require_roles
from api.dependencies.db import get_db_session
from models import Seller


class SellerNotFoundError(Exception):
    pass


async def get_current_seller(
    auth_context: Annotated[AuthContext, Depends(require_roles("seller"))],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Seller:
    result = await session.execute(
        select(Seller).where(Seller.user_id == auth_context.user_id)
    )
    seller = result.scalar_one_or_none()
    if seller is None:
        raise SellerNotFoundError("Seller profile not found.")
    return seller
