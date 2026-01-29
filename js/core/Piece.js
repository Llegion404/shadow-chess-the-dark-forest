class Piece {
  constructor(id, type, owner, position) {
    this.id = id;
    this.type = type;
    this.owner = owner;
    this.position = { ...position };
    this.hasMoved = false;
    this.isGhostActive = false;
    this.isDisguised = false;
  }

  move(position) {
    this.position = { ...position };
    this.hasMoved = true;
  }

  activateGhost() {
    this.isGhostActive = true;
  }

  deactivateGhost() {
    this.isGhostActive = false;
  }

  isKing() {
    return this.type === 'KING';
  }

  isDecoy() {
    return this.isDisguised && !this.isKing();
  }

  clone() {
    const cloned = new Piece(this.id, this.type, this.owner, this.position);
    cloned.hasMoved = this.hasMoved;
    cloned.isGhostActive = this.isGhostActive;
    cloned.isDisguised = this.isDisguised;
    return cloned;
  }

  getDisplayType() {
    if (this.isDisguised) return 'PAWN';
    return this.type;
  }

  static create(id, type, owner, position, options = {}) {
    const piece = new Piece(id, type, owner, position);
    if (options.disguise) {
      piece.isDisguised = options.disguise;
    }
    return piece;
  }

  static createDecoy(id, owner, position) {
    const piece = new Piece(id, 'PAWN', owner, position);
    piece.isDisguised = true;
    return piece;
  }

  static createKing(id, owner, position) {
    const piece = new Piece(id, 'KING', owner, position);
    piece.isDisguised = true;
    return piece;
  }
}
