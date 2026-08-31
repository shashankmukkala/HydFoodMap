"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  MercatorCoordinate,
  type CustomLayerInterface,
} from "maplibre-gl";
import * as THREE from "three";
import type { Billboard } from "@/lib/supabase";

type BillboardLayerProps = {
  map: MapLibreMap | null;
  billboards: Billboard[];
};

const LAYER_ID = "billboard-3d-layer";

export default function BillboardLayer({ map, billboards }: BillboardLayerProps) {
  const billboardsRef = useRef(billboards);
  useEffect(() => {
    billboardsRef.current = billboards;
  }, [billboards]);
  const panelsRef = useRef<Map<string, THREE.Mesh>>(new globalThis.Map());

  useEffect(() => {
    if (!map) return;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.Camera;

    const layer: CustomLayerInterface = {
      id: LAYER_ID,
      type: "custom",
      renderingMode: "3d",

      onAdd(_map, gl) {
        scene = new THREE.Scene();
        camera = new THREE.Camera();

        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const sun = new THREE.DirectionalLight(0xffffff, 0.6);
        sun.position.set(0, -1, 1);
        scene.add(sun);

        renderer = new THREE.WebGLRenderer({
          canvas: _map.getCanvas(),
          context: gl,
          antialias: true,
        });
        renderer.autoClear = false;

        rebuildPanels();
      },

      render(gl, args) {
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
        camera.projectionMatrix = m;
        renderer.resetState();
        renderer.render(scene, camera);
        map!.triggerRepaint();
      },
    };

    function panelMesh(billboard: Billboard) {
      const origin = MercatorCoordinate.fromLngLat(
        [billboard.lng, billboard.lat],
        billboard.elevation_m
      );
      const scale = origin.meterInMercatorCoordinateUnits();

      const geometry = new THREE.PlaneGeometry(billboard.width_m, billboard.height_m);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff7a3d,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(origin.x, origin.y, origin.z);
      mesh.scale.set(scale, scale, scale);
      // Stand the plane upright, then apply heading.
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.y = (billboard.heading_deg * Math.PI) / 180;
      mesh.geometry.translate(0, billboard.height_m / 2, 0);

      return mesh;
    }

    function rebuildPanels() {
      for (const mesh of panelsRef.current.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      panelsRef.current.clear();

      for (const billboard of billboardsRef.current) {
        const mesh = panelMesh(billboard);
        scene.add(mesh);
        panelsRef.current.set(billboard.id, mesh);
      }
    }

    (layer as CustomLayerInterface & { rebuildPanels: () => void }).rebuildPanels = rebuildPanels;

    map.addLayer(layer);

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const layer = map.getLayer(LAYER_ID) as
      | (CustomLayerInterface & { rebuildPanels?: () => void })
      | undefined;
    layer?.rebuildPanels?.();
    map.triggerRepaint();
  }, [map, billboards]);

  return null;
}
