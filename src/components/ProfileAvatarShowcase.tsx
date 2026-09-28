import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarColors, DEFAULT_GREY } from './AvatarViewer';
import { createFaceMesh } from '../utils/faceTexture';
import { attachShirtToLimbs } from '../utils/shirtTexture';
import { attachPantsToLimbs } from '../utils/pantsTexture';
import { createHairMesh, createHairMeshAsync } from '../utils/hairMesh';
import { createAccessoryMesh } from '../utils/accessoryMesh';
import { getAvatar3DSnapshot } from '../utils/avatar3DSnapshot';
import { getEquippedCustomAccessories } from '../types/fittedAccessories';
import { attachFittedAccessoriesToAvatar } from '../utils/fittedModelRenderer';

interface ProfileAvatarShowcaseProps {
  colors?: AvatarColors;
  selectedFaceId?: string;
  shirtDataUrl?: string | null;
  pantsDataUrl?: string | null;
  selectedHairId?: string;
  hairColor?: string;
  customHairObj?: string | null;
  selectedAccessoryId?: string;
  is3D?: boolean;
  onToggle3D?: () => void;
  className?: string;
}

export default function ProfileAvatarShowcase({
  colors = {
    head: DEFAULT_GREY,
    torso: DEFAULT_GREY,
    leftArm: DEFAULT_GREY,
    rightArm: DEFAULT_GREY,
    leftLeg: DEFAULT_GREY,
    rightLeg: DEFAULT_GREY,
  },
  selectedFaceId = 'classic-smile',
  shirtDataUrl = null,
  pantsDataUrl = null,
  selectedHairId = 'none',
  hairColor = '#4a2e1b',
  customHairObj = null,
  selectedAccessoryId = 'none',
  is3D = true,
  onToggle3D,
  className = '',
}: ProfileAvatarShowcaseProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const [snapshot2DUrl, setSnapshot2DUrl] = useState<string | null>(null);

  // Load 2D snapshot whenever props change
  useEffect(() => {
    let isCancelled = false;
    getAvatar3DSnapshot({
      colors,
      selectedFaceId,
      shirtDataUrl,
      pantsDataUrl,
      selectedHairId,
      hairColor,
      customHairObj,
      selectedAccessoryId,
      framing: 'fullBody',
    }).then((url) => {
      if (!isCancelled) setSnapshot2DUrl(url);
    });
    return () => {
      isCancelled = true;
    };
  }, [
    colors,
    selectedFaceId,
    shirtDataUrl,
    pantsDataUrl,
    selectedHairId,
    hairColor,
    customHairObj,
    selectedAccessoryId,
  ]);

  useEffect(() => {
    if (!is3D) return;
    const container = mountRef.current;
    if (!container) return;

    let animId = 0;
    let isMounted = true;

    // 1. Three.js Scene
    const scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 220;

    // Perspective Camera tuned for full body showcase from feet to top of head/hair
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.25, 9.2);
    camera.lookAt(0, 3.25, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xfff7ed, 0.8);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    // 3. Subtle floor shadow / base pedestal
    const shadowGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.05, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    scene.add(shadowMesh);

    // 4. Character Assembly Group
    const characterGroup = new THREE.Group();
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    const makeMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex || DEFAULT_GREY),
        roughness: 0.45,
        metalness: 0.08,
      });

    const headMat = makeMat(colors.head);
    const torsoMat = makeMat(colors.torso);
    const leftArmMat = makeMat(colors.leftArm);
    const rightArmMat = makeMat(colors.rightArm);
    const leftLegMat = makeMat(colors.leftLeg);
    const rightLegMat = makeMat(colors.rightLeg);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 3, 0);
    characterGroup.add(torsoMesh);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.7, 0);

    const headCylinderGeo = new THREE.CylinderGeometry(0.625, 0.625, 0.95, 32);
    const headCylinder = new THREE.Mesh(headCylinderGeo, headMat);
    headGroup.add(headCylinder);

    const topCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    topCapGeo.scale(1, 0.35, 1);
    const topCap = new THREE.Mesh(topCapGeo, headMat);
    topCap.position.y = 0.475;
    headGroup.add(topCap);

    const botCapGeo = new THREE.SphereGeometry(0.625, 32, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    botCapGeo.scale(1, 0.35, 1);
    const botCap = new THREE.Mesh(botCapGeo, headMat);
    botCap.position.y = -0.475;
    headGroup.add(botCap);

    // Face Decal
    const faceMesh = createFaceMesh(selectedFaceId);
    headGroup.add(faceMesh);

    // Hair
    if (customHairObj) {
      createHairMeshAsync(selectedHairId, hairColor, customHairObj).then((m) => {
        if (m && isMounted) headGroup.add(m);
      });
    } else if (selectedHairId && selectedHairId !== 'none') {
      const hairMesh = createHairMesh(selectedHairId, hairColor);
      if (hairMesh) headGroup.add(hairMesh);
    }

    // Accessory
    if (selectedAccessoryId && selectedAccessoryId !== 'none') {
      const accMesh = createAccessoryMesh(selectedAccessoryId);
      if (accMesh) headGroup.add(accMesh);
    }

    characterGroup.add(headGroup);

    // Arms
    const armGeo = new THREE.BoxGeometry(1, 2, 1);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(1.5, 4, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, leftArmMat);
    leftArmMesh.position.set(0, -1, 0);
    leftArmGroup.add(leftArmMesh);
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-1.5, 4, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, rightArmMat);
    rightArmMesh.position.set(0, -1, 0);
    rightArmGroup.add(rightArmMesh);
    characterGroup.add(rightArmGroup);

    // Legs
    const legGeo = new THREE.BoxGeometry(1, 2, 1);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.5, 2, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, leftLegMat);
    leftLegMesh.position.set(0, -1, 0);
    leftLegGroup.add(leftLegMesh);
    characterGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.5, 2, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, rightLegMat);
    rightLegMesh.position.set(0, -1, 0);
    rightLegGroup.add(rightLegMesh);
    characterGroup.add(rightLegGroup);

    // Shirt & Pants attachments
    let detachShirt = () => {};
    if (shirtDataUrl) {
      detachShirt = attachShirtToLimbs(torsoMesh, leftArmGroup, rightArmGroup, shirtDataUrl);
    }

    let detachPants = () => {};
    if (pantsDataUrl) {
      detachPants = attachPantsToLimbs(torsoMesh, leftLegGroup, rightLegGroup, pantsDataUrl);
    }

    try {
      const equippedCustom = getEquippedCustomAccessories();
      attachFittedAccessoriesToAvatar(characterGroup, equippedCustom, {
        head: headGroup,
        torso: torsoMesh,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
      });
    } catch (e) {}

    // 5. Animation Loop with Smooth Spinning
    const animate = () => {
      if (!isMounted) return;
      if (!isDraggingRef.current && characterGroup) {
        characterGroup.rotation.y += 0.012; // Continuous smooth 3D spin
      }
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    // Mouse / Touch Drag to Spin manually
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !characterGroupRef.current) return;
      const deltaX = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      characterGroupRef.current.rotation.y += deltaX * 0.015;
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDraggingRef.current = true;
        prevMouseXRef.current = e.touches[0].clientX;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !characterGroupRef.current || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.touches[0].clientX;
      characterGroupRef.current.rotation.y += deltaX * 0.015;
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Resize Handler
    const handleResize = () => {
      if (!container || !isMounted) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      detachShirt();
      detachPants();
      renderer.dispose();
      headCylinderGeo.dispose();
      topCapGeo.dispose();
      botCapGeo.dispose();
      faceMesh.geometry.dispose();
      torsoGeo.dispose();
      armGeo.dispose();
      legGeo.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      headMat.dispose();
      torsoMat.dispose();
      leftArmMat.dispose();
      rightArmMat.dispose();
      leftLegMat.dispose();
      rightLegMat.dispose();
      (faceMesh.material as THREE.Material).dispose();
    };
  }, [
    is3D,
    colors,
    selectedFaceId,
    shirtDataUrl,
    pantsDataUrl,
    selectedHairId,
    hairColor,
    customHairObj,
    selectedAccessoryId,
  ]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none ${className}`}>
      {/* 3D / 2D Toggle Badge */}
      {onToggle3D && (
        <button
          onClick={onToggle3D}
          className="absolute top-2.5 right-2.5 z-20 px-2.5 py-0.5 rounded-md bg-[#22173f] hover:bg-[#2d1f54] text-white font-bold text-xs shadow-md border border-purple-500/30 transition-all cursor-pointer select-none active:scale-95"
          title="Toggle 3D spinning / 2D static view"
        >
          {is3D ? '3D' : '2D'}
        </button>
      )}

      {is3D ? (
        <div
          ref={mountRef}
          className="w-full h-full min-h-[190px] max-h-[220px] flex items-center justify-center cursor-grab active:cursor-grabbing"
          title="Click and drag to spin 3D avatar"
        />
      ) : (
        <div className="w-full h-full min-h-[190px] max-h-[220px] flex items-center justify-center p-2">
          {snapshot2DUrl ? (
            <img
              src={snapshot2DUrl}
              alt="Avatar Full Body"
              className="max-h-[200px] w-auto object-contain filter drop-shadow-lg"
            />
          ) : (
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}
