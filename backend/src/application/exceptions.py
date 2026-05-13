# Auth
class InvalidCredentialsError(Exception):
    pass


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidBuyerPreferenceCategoriesError(Exception):
    pass


class InvalidOrExpiredResetTokenError(Exception):
    pass


class PasswordDoesNotMatchMinimumRequirementsError(Exception):
    pass


# Categories
class ManagedCategoryNotFoundError(Exception):
    pass


class CategoryAlreadyExistsError(Exception):
    pass


class CategoryDeleteBlockedError(Exception):
    pass


class InvalidCategoryFieldError(Exception):
    pass


# Cart
class CartBuyerProfileNotFoundError(Exception):
    pass


class CartProductNotFoundError(Exception):
    pass


class CartItemNotFoundError(Exception):
    pass


class CartQuantityExceedsStockError(Exception):
    pass


# Notifications
class NotificationNotFoundError(Exception):
    pass


class NotificationAccessDeniedError(Exception):
    pass


# Orders
class OrderNotFoundError(Exception):
    pass


class OrderAccessDeniedError(Exception):
    pass


class InvalidOrderStatusTransitionError(Exception):
    pass


class BuyerProfileNotFoundError(Exception):
    pass


class CartEmptyError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


# Products
class ProductNotFoundError(Exception):
    pass


class ProductNotOwnedBySellerError(Exception):
    pass


class CategoryNotFoundError(Exception):
    pass


class SellerCategoryMismatchError(Exception):
    pass


class DuplicateSlugError(Exception):
    pass


class TooManyImagesError(Exception):
    pass


class InvalidImageFormatError(Exception):
    pass


class ImageTooLargeError(Exception):
    pass


class InvalidFieldError(Exception):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


# Reviews
class ReviewNotFoundError(Exception):
    pass


class ReviewNotOwnedBySellerError(Exception):
    pass


class ReviewReplyAlreadyExistsError(Exception):
    pass


class ReviewAlreadyExistsError(Exception):
    pass


class ReviewEligibilityError(Exception):
    pass


class ReviewBuyerProfileNotFoundError(Exception):
    pass


# Sellers
class SellerProfileAlreadyExistsError(Exception):
    pass


class SellerProfileNotFoundError(Exception):
    pass


class InvalidLogoTypeError(Exception):
    pass


class LogoTooLargeError(Exception):
    pass


class AdminSellerNotFoundError(Exception):
    pass


class AdminSellerCategoryNotFoundError(Exception):
    pass


class SellerCategoryAssignmentAlreadyExistsError(Exception):
    pass


class SellerCategoryAssignmentNotFoundError(Exception):
    pass


class SellerCategoryAssignmentDeleteBlockedError(Exception):
    pass


# Sales stats
class InvalidSalesStatsQueryError(Exception):
    pass
