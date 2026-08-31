// Registry of real 3D models placed on the map at exact coordinates —
// trees, monuments (Charminar, etc.), and custom cafe buildings. Drop the
// .glb file in /public/models/, add an entry here, and ModelLayer picks it
// up automatically. See public/models/README.md for export requirements.

export type ModelCategory = "tree" | "monument" | "cafe-building";

export type ModelPlacement = {
  id: string;
  category: ModelCategory;
  /** Path under /public, e.g. "/models/charminar.glb" */
  url: string;
  lng: number;
  lat: number;
  /** Ground elevation in meters above sea level, if the site isn't flat. Default 0. */
  elevationM?: number;
  /** Uniform scale multiplier applied on top of the model's own units. Default 1. */
  scale?: number;
  /** Rotation around the vertical axis, in degrees. Default 0. */
  rotationDeg?: number;
};

// Example (commented out until the real .glb files exist):
//
// export const MODEL_PLACEMENTS: ModelPlacement[] = [
//   {
//     id: "charminar",
//     category: "monument",
//     url: "/models/charminar.glb",
//     lng: 78.4747,
//     lat: 17.3616,
//     rotationDeg: 0,
//   },
//   {
//     id: "tree-1",
//     category: "tree",
//     url: "/models/tree.glb",
//     lng: 78.4855,
//     lat: 17.3842,
//     scale: 1.2,
//   },
// ];

export const MODEL_PLACEMENTS: ModelPlacement[] = [];
