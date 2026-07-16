import strawberry
from strawberry import federation

from communication_gateway.api.graphql.queries.provider_query import ProviderQuery


@strawberry.type
class Query(ProviderQuery):
    pass


schema = federation.Schema(query=Query, federation_version="2.11")
