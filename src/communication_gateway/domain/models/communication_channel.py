from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from communication_gateway.domain.enums import CommunicationChannelType


@dataclass(frozen=True)
class CommunicationChannel:
    type: CommunicationChannelType
