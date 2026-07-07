from dataclasses import dataclass

from communication_gateway.domain.enums import CommunicationChannelType


@dataclass(frozen=True)
class CommunicationChannel:
    type: CommunicationChannelType
