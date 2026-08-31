"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, MercatorCoordinate, type CustomLayerInterface } from "maplibre-gl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MODEL_PLACEMENTS, type ModelPlacement } from "@/lib/models";

type ModelLayerProps = {
  map: MapLibreMap | null;
};

const LAYER_ID = "model-3d-layer";
const loader = new GLTFLoader();
const gltfCache = new Map<string, Promise<THREE.Group>>();

function loadModel(url: string): Promise<THREE.Group> {
  let cached = gltfCache.get(url);
  if (!cached) {
    cached = loader.loadAsync(url).then((gltf) => gltf.scene);
    gltfCache.set(url, cached);
  }
  return cached;
}

export default function ModelLayer({ map }: ModelLayerProps) {
  const placementsRef = useRef(MODEL_PLACEMENTS);

  useEffect(() => {
    if (!map || placementsRef.current.length === 0) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let cancelled = false;

    const layer: CustomLayerInterface = {
      id: LAYER_ID,
      type: "custom",
      renderingMode: "3d",

      onAdd(_map, gl) {
        scene = new THREE.Scene();
        camera = new THREE.Camera();

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        const sun = new THREE.DirectionalLight(0xffffff, 0.7);
        sun.position.set(0, -1, 1);
        scene.add(sun);

        renderer = new THREE.WebGLRenderer({
          canvas: _map.getCanvas(),
          context: gl,
          antialias: true,
        });
        renderer.autoClear = false;

        for (const placement of placementsRef.current) {
          loadModel(placement.url)
            .then((original) => {
              if (cancelled) return;
              const instance = original.clone(true);
              placeInstance(instance, placement);
              scene.add(instance);
              map.triggerRepaint();
            })
            .catch((err) => {
              console.error(`ModelLayer: failed to load ${placement.url}`, err);
            });
        }
      },

      render(gl, args) {
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
        camera.projectionMatrix = m;
        renderer.resetState();
        renderer.render(scene, camera);
        map!.triggerRepaint();
      },
    };

    map.addLayer(layer);

    return () => {
      cancelled = true;
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    };
  }, [map]);

  return null;
}

function placeInstance(instance: THREE.Group, placement: ModelPlacement) {
  const origin = MercatorCoordinate.fromLngLat(
    [placement.lng, placement.lat],
    placement.elevationM ?? 0
  );
  const metersToMercator = origin.meterInMercatorCoordinateUnits();
  const scale = metersToMercator * (placement.scale ?? 1);

  instance.position.set(origin.x, origin.y, origin.z);
  instance.scale.set(scale, scale, scale);
  // glTF is Y-up; MapLibre's Mercator space is Z-up, so tip the model onto its base.
  instance.rotation.x = Math.PI / 2;
  instance.rotation.y = -((placement.rotationDeg ?? 0) * Math.PI) / 180;
}
