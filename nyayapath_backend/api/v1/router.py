from fastapi import APIRouter
from .endpoints_cases import router as cases_router
from .endpoints_statutes import router as statutes_router

api_router = APIRouter()
api_router.include_router(cases_router, prefix="/cases", tags=["cases"])
api_router.include_router(statutes_router, prefix="/statutes", tags=["statutes"])
