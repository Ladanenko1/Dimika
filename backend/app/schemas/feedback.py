from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    message: str = Field(min_length=1, max_length=4000)


class FeedbackOut(BaseModel):
    status: str


class QuestionOut(BaseModel):
    id: int
    name: str
    email: str
    question: str

    model_config = {"from_attributes": True}
