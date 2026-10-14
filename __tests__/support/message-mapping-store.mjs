/** In-memory mapping store for isolated tests only. */
export class InMemoryMessageMappingStore {
  byProvider = new Map();
  byInternal = new Map();
  async save(mapping) {
    const copy = { ...mapping };
    this.byProvider.set(mapping.providerMessageId, copy);
    this.byInternal.set(mapping.internalId, copy);
  }
  async getByProviderMessageId(id) {
    const value = this.byProvider.get(id);
    return value ? { ...value } : null;
  }
  async getByInternalId(id) {
    const value = this.byInternal.get(id);
    return value ? { ...value } : null;
  }
  async findByProviderAndProviderMessageId(provider, id) {
    const mapping = await this.getByProviderMessageId(id);
    return mapping?.provider === provider ? mapping : null;
  }
  async updateStatus(id, status, error = null) {
    const mapping = this.byProvider.get(id);
    if (mapping) {
      Object.assign(mapping, {
        status,
        lastError: error,
        lastStatusChange: new Date(),
        updatedAt: new Date(),
      });
    }
  }
  async incrementRetry(id) {
    const mapping = this.byInternal.get(id);
    if (mapping) {
      mapping.retryCount += 1;
    }
  }
  async recordFailure() {}
  async health() {
    return true;
  }
}
