from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from models import Product, ProductImage


class TooManyImagesError(Exception):
    pass


class InvalidImageFormatError(Exception):
    pass


class ImageTooLargeError(Exception):
    pass


class ProcessImagesUseCase:
    ALLOWED_FORMATS = {"image/jpeg", "image/png", "image/webp"}
    MAX_FILE_SIZE = 5 * 1024 * 1024
    MAX_IMAGES = 10

    def __init__(self, session: AsyncSession, media_root: str = "media") -> None:
        self._session = session
        self._media_root = Path(media_root)

    async def execute(
        self,
        product: Product,
        images: list[UploadFile],
    ) -> list[ProductImage]:
        if len(images) > self.MAX_IMAGES:
            raise TooManyImagesError(f"Cannot upload more than {self.MAX_IMAGES} images.")

        if not images:
            return []

        product_images: list[ProductImage] = []
        product_dir = self._media_root / "products" / str(product.id)
        product_dir.mkdir(parents=True, exist_ok=True)

        for idx, upload_file in enumerate(images):
            self._validate_image_format(upload_file)
            
            content = await upload_file.read()
            
            if len(content) > self.MAX_FILE_SIZE:
                raise ImageTooLargeError(
                    f"Image size exceeds maximum allowed size of {self.MAX_FILE_SIZE // (1024 * 1024)}MB."
                )
            
            self._validate_image_with_pillow(content)
            
            file_extension = self._get_file_extension(upload_file.content_type)
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = product_dir / unique_filename
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            relative_path = f"products/{product.id}/{unique_filename}"
            
            product_image = ProductImage(
                product_id=product.id,
                path=relative_path,
                is_thumbnail=(idx == 0),
                display_order=idx,
            )
            
            self._session.add(product_image)
            product_images.append(product_image)

        await self._session.commit()
        
        for img in product_images:
            await self._session.refresh(img)

        return product_images

    def _validate_image_format(self, upload_file: UploadFile) -> None:
        if upload_file.content_type not in self.ALLOWED_FORMATS:
            raise InvalidImageFormatError(
                f"Invalid image format. Allowed formats: {', '.join(self.ALLOWED_FORMATS)}"
            )

    def _validate_image_with_pillow(self, content: bytes) -> None:
        try:
            img = Image.open(io.BytesIO(content))
            img.verify()
        except Exception as exc:
            raise InvalidImageFormatError("Invalid or corrupted image file.") from exc

    def _get_file_extension(self, content_type: str) -> str:
        extensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }
        return extensions.get(content_type, ".jpg")
