from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.products import CreateProductImagesMetadataRequestDTO
from application.exceptions import (
    ImageTooLargeError,
    InvalidFieldError,
    InvalidImageFormatError,
    TooManyImagesError,
)
from models import Product, ProductImage


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
        metadata_request: CreateProductImagesMetadataRequestDTO | None = None,
    ) -> list[ProductImage]:
        if len(images) > self.MAX_IMAGES:
            raise TooManyImagesError(f"Cannot upload more than {self.MAX_IMAGES} images.")

        if not images:
            return []

        image_metadata = self._resolve_image_metadata(images, metadata_request)

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
            metadata = image_metadata[idx]
            
            product_image = ProductImage(
                product_id=product.id,
                path=relative_path,
                is_thumbnail=metadata.is_thumbnail,
                display_order=metadata.display_order,
            )
            
            self._session.add(product_image)
            product_images.append(product_image)

        await self._session.commit()
        
        for img in product_images:
            await self._session.refresh(img)

        return product_images

    def _resolve_image_metadata(
        self,
        images: list[UploadFile],
        metadata_request: CreateProductImagesMetadataRequestDTO | None,
    ):
        if metadata_request is None:
            return CreateProductImagesMetadataRequestDTO.model_validate(
                {
                    "images": [
                        {
                            "display_order": idx,
                            "is_thumbnail": idx == 0,
                        }
                        for idx, _ in enumerate(images)
                    ]
                }
            ).images

        submitted_metadata = metadata_request.images

        if len(submitted_metadata) != len(images):
            raise InvalidFieldError(
                "images_metadata",
                "images_metadata must include exactly one metadata entry for each uploaded image.",
            )

        display_orders = [image.display_order for image in submitted_metadata]
        if len(display_orders) != len(set(display_orders)):
            raise InvalidFieldError(
                "images_metadata",
                "Duplicate display_order values are not allowed.",
            )

        thumbnail_count = sum(1 for image in submitted_metadata if image.is_thumbnail)
        if thumbnail_count != 1:
            raise InvalidFieldError(
                "images_metadata",
                "Exactly one image must be marked as thumbnail.",
            )

        ordered_metadata = sorted(submitted_metadata, key=lambda image: image.display_order)
        for normalized_order, metadata in enumerate(ordered_metadata):
            metadata.display_order = normalized_order

        return submitted_metadata

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
