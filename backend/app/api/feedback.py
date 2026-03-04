from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Question
from app.schemas.feedback import FeedbackCreate, FeedbackOut
from app.services.email import EmailNotConfiguredError, send_feedback_email


router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_202_ACCEPTED)
def create_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)) -> FeedbackOut:
    if not payload.email.strip() or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and question are required",
        )

    question = Question(
        name=payload.name.strip(),
        email=payload.email.strip(),
        question=payload.message.strip(),
    )
    db.add(question)
    db.commit()

    status_text = "sent"
    try:
        send_feedback_email(payload)
    except (EmailNotConfiguredError, OSError):
        status_text = "saved"

    return FeedbackOut(status=status_text)
