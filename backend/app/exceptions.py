from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class AuthenticationError(AppException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class NotFoundError(AppException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ValidationError(AppException):
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ExternalServiceError(AppException):
    def __init__(self, detail: str = "External service error"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Access forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class EmailNotFoundError(AppException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No email found in LinkedIn post. Please provide a recipient email."
        )


class GmailNotConnectedError(AuthenticationError):
    def __init__(self):
        super().__init__(
            detail="Gmail not connected. Please log in again to authorize email sending."
        )


class UnprocessableEntityError(AppException):
    def __init__(self, detail: str = "Could not process the request content"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class RateLimitedError(AppException):
    def __init__(self, detail: str = "Service is busy. Try again shortly.", retry_after: int = 30):
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
        self.headers = {"Retry-After": str(retry_after)}


class UpstreamResponseError(AppException):
    def __init__(self, detail: str = "Upstream service returned an unusable response"):
        super().__init__(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


class ServiceUnavailableError(AppException):
    def __init__(self, detail: str = "Service temporarily unavailable", retry_after: int = 30):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
        self.headers = {"Retry-After": str(retry_after)}
