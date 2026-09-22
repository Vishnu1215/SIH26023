/**
 * In-Memory Document Model
 * Stores all document metadata in memory without a physical database.
 */
class DocumentModel {
  constructor() {
    this.documents = [];
  }

  /**
   * Add a new document metadata record to memory
   * @param {Object} document - Document metadata object
   * @returns {Object} Stored document
   */
  addDocument(document) {
    this.documents.push(document);
    return document;
  }

  /**
   * Retrieve all document records sorted newest first
   * @returns {Array<Object>}
   */
  getAllDocuments() {
    return [...this.documents].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  /**
   * Find a single document by its UUID
   * @param {string} documentId
   * @returns {Object|null}
   */
  getDocumentById(documentId) {
    return this.documents.find((doc) => doc.documentId === documentId) || null;
  }

  /**
   * Update the status of a document
   * @param {string} documentId
   * @param {string} status
   * @returns {Object|null}
   */
  updateStatus(documentId, status) {
    const doc = this.getDocumentById(documentId);
    if (doc) {
      doc.status = status;
      return doc;
    }
    return null;
  }

  /**
   * Backward-compatible aliases
   */
  create(document) {
    return this.addDocument(document);
  }

  findAll() {
    return this.getAllDocuments();
  }

  findById(documentId) {
    return this.getDocumentById(documentId);
  }

  count() {
    return this.documents.length;
  }

  clear() {
    this.documents = [];
  }
}

// Singleton in-memory model instance
export const documentModel = new DocumentModel();
export default documentModel;
