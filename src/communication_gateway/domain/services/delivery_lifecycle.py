import logging

from communication_gateway.domain.enums import DeliveryStatus
from communication_gateway.domain.errors import InvalidStatusTransitionError

logger = logging.getLogger(__name__)

_VALID_TRANSITIONS: dict[DeliveryStatus, set[DeliveryStatus]] = {
    DeliveryStatus.UNKNOWN: {DeliveryStatus.PENDING, DeliveryStatus.FAILED},
    DeliveryStatus.PENDING: {
        DeliveryStatus.QUEUED,
        DeliveryStatus.SENT,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.QUEUED: {
        DeliveryStatus.SENT,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.SENT: {
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.DELIVERED: {
        DeliveryStatus.READ,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.READ: {DeliveryStatus.FAILED, DeliveryStatus.CANCELLED},
    DeliveryStatus.FAILED: {DeliveryStatus.PENDING, DeliveryStatus.CANCELLED},
    DeliveryStatus.CANCELLED: set(),
}


def is_valid_transition(current: DeliveryStatus, next_status: DeliveryStatus) -> bool:
    if current == next_status:
        return True
    allowed = _VALID_TRANSITIONS.get(current)
    if allowed is None:
        return False
    return next_status in allowed


def assert_valid_transition(
    current: DeliveryStatus,
    next_status: DeliveryStatus,
) -> None:
    if not is_valid_transition(current, next_status):
        logger.warning(
            "invalid_status_transition",
            current_status=current.value,
            attempted_status=next_status.value,
        )
        raise InvalidStatusTransitionError(current, next_status)
