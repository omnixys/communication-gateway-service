import pytest

from communication_gateway.domain.enums import DeliveryStatus
from communication_gateway.domain.errors import InvalidStatusTransitionError
from communication_gateway.domain.services.delivery_lifecycle import (
    assert_valid_transition,
    is_valid_transition,
)


class TestDeliveryLifecycle:
    @pytest.mark.parametrize(
        "current,next_",
        [
            (DeliveryStatus.UNKNOWN, DeliveryStatus.PENDING),
            (DeliveryStatus.PENDING, DeliveryStatus.QUEUED),
            (DeliveryStatus.PENDING, DeliveryStatus.SENT),
            (DeliveryStatus.QUEUED, DeliveryStatus.SENT),
            (DeliveryStatus.SENT, DeliveryStatus.DELIVERED),
            (DeliveryStatus.DELIVERED, DeliveryStatus.READ),
            (DeliveryStatus.PENDING, DeliveryStatus.FAILED),
            (DeliveryStatus.QUEUED, DeliveryStatus.FAILED),
            (DeliveryStatus.SENT, DeliveryStatus.FAILED),
            (DeliveryStatus.DELIVERED, DeliveryStatus.FAILED),
            (DeliveryStatus.READ, DeliveryStatus.FAILED),
            (DeliveryStatus.FAILED, DeliveryStatus.CANCELLED),
            (DeliveryStatus.PENDING, DeliveryStatus.CANCELLED),
            (DeliveryStatus.FAILED, DeliveryStatus.PENDING),
        ],
    )
    def test_valid_transitions(self, current: DeliveryStatus, next_: DeliveryStatus) -> None:
        assert is_valid_transition(current, next_)
        assert_valid_transition(current, next_)

    @pytest.mark.parametrize(
        "current,next_",
        [
            (DeliveryStatus.PENDING, DeliveryStatus.READ),
            (DeliveryStatus.QUEUED, DeliveryStatus.DELIVERED),
            (DeliveryStatus.SENT, DeliveryStatus.QUEUED),
            (DeliveryStatus.DELIVERED, DeliveryStatus.SENT),
            (DeliveryStatus.READ, DeliveryStatus.DELIVERED),
            (DeliveryStatus.CANCELLED, DeliveryStatus.PENDING),
            (DeliveryStatus.CANCELLED, DeliveryStatus.SENT),
            (DeliveryStatus.UNKNOWN, DeliveryStatus.DELIVERED),
        ],
    )
    def test_invalid_transitions(self, current: DeliveryStatus, next_: DeliveryStatus) -> None:
        assert not is_valid_transition(current, next_)
        with pytest.raises(InvalidStatusTransitionError):
            assert_valid_transition(current, next_)

    def test_same_status_is_valid(self) -> None:
        for status in DeliveryStatus:
            assert is_valid_transition(status, status)
            assert_valid_transition(status, status)
