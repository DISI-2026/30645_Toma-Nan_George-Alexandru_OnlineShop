from pydantic import BaseModel


class GetRecommendationsRequest(BaseModel):
    user_id: int
    page: int = 1
    page_size: int = 10
