# 3D model placement

Drop your exported models here, then register each one in
[`lib/models.ts`](../../lib/models.ts) with its exact lng/lat. `ModelLayer`
(`components/ModelLayer.tsx`) loads and anchors them automatically — no other
code changes needed per model.

## Export requirements

- **Format:** glTF Binary (`.glb`) — one file per model, textures embedded.
- **Scale:** model your object at real-world size in **meters**, e.g. a tree
  that's 6m tall should be 6 units tall in your modeling tool. `ModelLayer`
  converts meters → map units for you; it does not guess your scale. If a
  model comes out too big/small on the map, use the placement's `scale`
  field in `lib/models.ts` as a fudge factor rather than re-exporting.
- **Orientation:** export Y-up (glTF's default). Model the object standing
  upright with its base at the origin (0,0,0) — that point becomes the exact
  lng/lat anchor. `ModelLayer` handles the Y-up → map's Z-up conversion.
- **Origin/pivot:** put the pivot at the base center of the model (where it
  touches the ground), not at its bounding-box center — otherwise it'll
  appear to float or sink into the terrain.
- **Facing:** model it facing +Z ("forward"); use the placement's
  `rotationDeg` field to orient it on the map instead of rotating the mesh
  itself.
- **Poly count:** for anything placed many times (trees especially), keep it
  low-poly — each placement is a separate draw call, and MapLibre is already
  rendering the base map's own geometry every frame.

## Registering a placement

Edit `lib/models.ts`:

```ts
export const MODEL_PLACEMENTS: ModelPlacement[] = [
  {
    id: "charminar",
    category: "monument",
    url: "/models/charminar.glb",
    lng: 78.4747,
    lat: 17.3616,
    rotationDeg: 0,
  },
];
```

Reload the page — `ModelLayer` fetches, caches (by URL, so repeated trees
only load once), clones, and places each one.
