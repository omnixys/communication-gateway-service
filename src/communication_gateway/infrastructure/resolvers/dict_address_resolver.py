from typing import TYPE_CHECKING

from communication_gateway.application.ports.address_resolver import AddressResolver

if TYPE_CHECKING:
    from communication_gateway.domain.enums import CommunicationChannelType


class DictAddressResolver(AddressResolver):
    def __init__(
        self,
        mapping: dict[str, dict[CommunicationChannelType, str]] | None = None,
    ) -> None:
        self._forward: dict[str, dict[CommunicationChannelType, str]] = mapping or {}
        self._reverse: dict[str, str] = {}
        for uid, channels in self._forward.items():
            for address in channels.values():
                self._reverse[address] = uid

    async def resolve(
        self,
        user_id: str,
        channel: CommunicationChannelType,
    ) -> str:
        user_map = self._forward.get(user_id)
        if user_map is None:
            msg = f"No address mapping for user '{user_id}'"
            raise ValueError(msg)
        address = user_map.get(channel)
        if address is None:
            msg = f"No {channel.value} address for user '{user_id}'"
            raise ValueError(msg)
        return address

    async def reverse_lookup(self, address: str) -> str | None:
        return self._reverse.get(address)
