import strawberry

from communication_gateway.api.graphql.queries.provider_query import ProviderQuery


@strawberry.type
class Query(ProviderQuery):
    pass


schema = strawberry.Schema(query=Query)
