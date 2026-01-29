class Board {
  constructor(width, height, terrain = null) {
    this.width = width;
    this.height = height;
    this.terrain = terrain || this.generateTerrain(width, height);
  }

  generateTerrain(width, height, seed = width * height) {
    const terrain = [];
    const terrainTypes = ['PLAIN', 'FOREST', 'RUINS', 'SACRED', 'SWAMP'];

    let seedValue = seed;
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    for (let y = 0; y < height; y++) {
      terrain[y] = [];
      for (let x = 0; x < width; x++) {
        const noise = Math.sin(x * 0.1 + seededRandom()) * Math.cos(y * 0.1 + seededRandom()) +
                     Math.sin(x * 0.05 + y * 0.05) * 0.5;

        let type;
        if (noise > 0.8) type = 'SACRED';
        else if (noise > 0.5) type = 'SWAMP';
        else if (noise > 0.2) type = 'FOREST';
        else if (noise > -0.3) type = 'PLAIN';
        else type = 'RUINS';

        terrain[y][x] = type;
      }
    }

    return terrain;
  }

  getTerrainAt(position) {
    if (!this.isValidPosition(position)) return null;
    return this.terrain[position.y][position.x];
  }

  isValidPosition(position) {
    return position.x >= 0 && position.x < this.width &&
           position.y >= 0 && position.y < this.height;
  }

  isObstacle(position) {
    return this.getTerrainAt(position) === 'RUINS';
  }

  getTerrainModifier(terrain, pieceType) {
    switch (terrain) {
      case 'FOREST':
        if (pieceType === 'KNIGHT') return 'BLOCKED';
        return 0.5;
      case 'SACRED':
        return 1;
      case 'SWAMP':
        return -1;
      default:
        return 0;
    }
  }

  clone() {
    const clonedTerrain = this.terrain.map(row => [...row]);
    return new Board(this.width, this.height, clonedTerrain);
  }
}
