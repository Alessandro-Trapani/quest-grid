import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Image,
  Group,
  Line,
  Label,
  Tag,
  RegularPolygon,
} from "react-konva";
import useImage from "./assets/guitar.png";
import nauruImage from "./assets/characters/nauru.jpg";
import martinImage from "./assets/characters/martin.jpg";
import eredinImage from "./assets/characters/eredin.jpg";
import hardekImage from "./assets/characters/hardek.jpg";
import lexiasImage from "./assets/characters/lexias.jpg";
import defaultTokenImage from "./assets/guitar.png";

const PREDEFINED_NAMES = ["eredin", "hardek", "lexias", "martin", "nauru"];

const MAIN_CHARACTERS = [
  {
    name: "eredin",
    image: eredinImage,
    x: 11,
    y: 5,
    totalHp: 1,
    currentHp: 1,
    notes: "",
    stats: [],
  },
  {
    name: "hardek",
    image: hardekImage,
    x: 0,
    y: 0,
    totalHp: 1,
    currentHp: 1,
    notes: "",
    stats: [],
  },
  {
    name: "lexias",
    image: lexiasImage,
    x: 0,
    y: 0,
    totalHp: 1,
    currentHp: 1,
    notes: "",
    stats: [],
  },
  {
    name: "martin",
    image: martinImage,
    x: 0,
    y: 0,
    totalHp: 1,
    currentHp: 1,
    notes: "",
    stats: [],
  },
  {
    name: "nauru",
    image: nauruImage,
    x: 0,
    y: 0,
    totalHp: 1,
    currentHp: 1,
    notes: "",
    stats: [],
  },
];

// Utility functions for localStorage
function loadPredefinedOverrides() {
  try {
    return JSON.parse(localStorage.getItem("dndPredefinedOverrides")) || {};
  } catch {
    return {};
  }
}
function savePredefinedOverrides(overrides) {
  localStorage.setItem("dndPredefinedOverrides", JSON.stringify(overrides));
}
function loadCustomCharacters() {
  try {
    return JSON.parse(localStorage.getItem("dndCustomCharacters")) || [];
  } catch {
    return [];
  }
}
function saveCustomCharacters(chars) {
  localStorage.setItem("dndCustomCharacters", JSON.stringify(chars));
}

const DnDGrid = () => {
  // Grid configuration
  const [gridConfig, setGridConfig] = useState({
    width: 20, // grid cells wide
    height: 15, // grid cells tall
    cellSize: 45, // pixels per grid cell
    showGrid: true,
    showCoordinates: true,
    gridColor: "#555",
    backgroundColor: "#1e2b38",
  });

  // Add squareFeetPerCell state
  const [squareFeetPerCell, setSquareFeetPerCell] = useState(1.5);

  // Character state
  const getGridCenter = (width, height, size) => ({
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
  });
  const [characters, setCharacters] = useState([]);

  // UI state
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [hoveredCharId, setHoveredCharId] = useState(null);
  const [draggingCharId, setDraggingCharId] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState([]);
  const [fixedAoeColor] = useState("rgba(255, 100, 100, 0.4)");
  const [aoeTool, setAoeTool] = useState({
    active: false,
    shape: "circle", // circle, square, cone
    size: 3, // in grid units
  });
  const [aoePosition, setAoePosition] = useState({ x: 0, y: 0 });
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    x: Math.floor((gridConfig.width - 1) / 2),
    y: Math.floor((gridConfig.height - 1) / 2),
    size: 1,
    hp: 10,
    maxHp: 10,
    ac: 10,
    isHighGround: false,
    conditions: [],
    image: null,
    notes: "",
    stats: [], // Modular stats
  });

  // Refs
  const stageRef = useRef();
  const gridLayerRef = useRef();

  // Calculate grid dimensions
  const gridWidth = gridConfig.width * gridConfig.cellSize;
  const gridHeight = gridConfig.height * gridConfig.cellSize;

  // Character images mapping (using emoji for demonstration)
  const characterImages = {
    warrior: "⚔️",
    ranger: "🏹",
    dragon: "🐉",
    golem: "🗿",
  };

  // On mount, load characters from localStorage
  useEffect(() => {
    const overrides = loadPredefinedOverrides();
    const customChars = loadCustomCharacters();
    const mainChars = MAIN_CHARACTERS.map((base) => {
      const o = overrides[base.name];
      return {
        id: base.name,
        name: base.name,
        x: typeof o?.position?.x === "number" ? o.position.x : base.x ?? 0,
        y: typeof o?.position?.y === "number" ? o.position.y : base.y ?? 0,
        totalHp: o?.totalHp ?? base.totalHp,
        hp: o?.currentHp ?? base.currentHp,
        maxHp: o?.totalHp ?? base.totalHp,
        notes: o?.notes ?? base.notes,
        stats: o?.stats ?? base.stats,
        isPredefined: true,
        image: base.image,
      };
    });
    setCharacters([...mainChars, ...customChars]);
  }, []);

  // Helper to persist all character changes
  function persistCharacters(chars) {
    const overrides = {};
    const customs = [];
    for (const c of chars) {
      if (MAIN_CHARACTERS.some((mc) => mc.name === c.name)) {
        overrides[c.name] = {
          position: { x: c.x, y: c.y },
          notes: c.notes,
          totalHp: c.maxHp ?? c.totalHp,
          currentHp: c.hp ?? c.currentHp,
          stats: c.stats || [],
        };
      } else {
        customs.push(c);
      }
    }
    savePredefinedOverrides(overrides);
    saveCustomCharacters(customs);
  }

  // Wrap all setCharacters calls to persist
  function setCharactersAndPersist(newChars) {
    setCharacters(newChars);
    persistCharacters(newChars);
  }

  // Handle grid mouse move (for AOE preview)
  const handleGridMouseMove = (e) => {
    if (!aoeTool.active) return;

    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    const gridX = Math.round(pointerPos.x / gridConfig.cellSize);
    const gridY = Math.round(pointerPos.y / gridConfig.cellSize);

    setAoePosition({ x: gridX, y: gridY });
  };

  // Add image upload handler
  const handleImageUpload = (e, setFn, obj) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFn({ ...obj, image: ev.target.result });
    };
    reader.readAsDataURL(file);
  };

  // Measurement tool: click once for start, second for end (grid cell centers)
  const handleStageClick = (e) => {
    if (!measurementMode) return;
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    const gridX = Math.floor(pointerPos.x / gridConfig.cellSize);
    const gridY = Math.floor(pointerPos.y / gridConfig.cellSize);
    const cellCenter = {
      x: gridX * gridConfig.cellSize + gridConfig.cellSize / 2,
      y: gridY * gridConfig.cellSize + gridConfig.cellSize / 2,
    };
    setMeasurementPoints((prev) => {
      if (prev.length === 1) {
        return [prev[0], cellCenter];
      } else {
        return [cellCenter];
      }
    });
  };

  // AOE cone directionality
  const [coneOrigin, setConeOrigin] = useState(null);
  const [coneAngle, setConeAngle] = useState(null);
  const [coneDragging, setConeDragging] = useState(false);

  // Handle cone drag events
  const handleAoeStageMouseDown = (e) => {
    if (!aoeTool.active || aoeTool.shape !== "cone") return;
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    const gridX = Math.floor(pointerPos.x / gridConfig.cellSize);
    const gridY = Math.floor(pointerPos.y / gridConfig.cellSize);
    setConeOrigin({ x: gridX, y: gridY });
    setConeDragging(true);
    setConeAngle(0);
  };
  const handleAoeStageMouseMove = (e) => {
    if (
      !aoeTool.active ||
      aoeTool.shape !== "cone" ||
      !coneDragging ||
      !coneOrigin
    )
      return;
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    const dx =
      pointerPos.x -
      (coneOrigin.x * gridConfig.cellSize + gridConfig.cellSize / 2);
    const dy =
      pointerPos.y -
      (coneOrigin.y * gridConfig.cellSize + gridConfig.cellSize / 2);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    setConeAngle(angle);
  };
  const handleAoeStageMouseUp = (e) => {
    if (!aoeTool.active || aoeTool.shape !== "cone") return;
    setConeDragging(false);
  };

  // Render AOE spell indicator
  const renderAoeIndicator = () => {
    if (!aoeTool.active) return null;
    const { shape, size } = aoeTool;
    const color = fixedAoeColor;
    const cellSize = gridConfig.cellSize;
    if (shape === "cone" && coneOrigin && coneAngle !== null) {
      const centerX = coneOrigin.x * cellSize + cellSize / 2;
      const centerY = coneOrigin.y * cellSize + cellSize / 2;
      return (
        <Group listening={false}>
          <RegularPolygon
            x={centerX}
            y={centerY}
            sides={3}
            radius={size * cellSize}
            fill={color}
            stroke="#ff5555"
            strokeWidth={2}
            opacity={0.7}
            rotation={coneAngle}
            listening={false}
          />
          <Text
            x={centerX - 20}
            y={centerY - 10}
            text={`${size * squareFeetPerCell}ft cone`}
            fontSize={14}
            fill="white"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );
    }
    if (shape === "circle") {
      const centerX = aoePosition.x * cellSize + cellSize / 2;
      const centerY = aoePosition.y * cellSize + cellSize / 2;
      return (
        <Group listening={false}>
          <Circle
            x={centerX}
            y={centerY}
            radius={size * cellSize}
            fill={color}
            stroke="#ff5555"
            strokeWidth={2}
            opacity={0.7}
            listening={false}
          />
          <Text
            x={centerX - 20}
            y={centerY - 10}
            text={`${size * squareFeetPerCell}ft radius`}
            fontSize={14}
            fill="white"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );
    }
    if (shape === "square") {
      const squareSize = size * cellSize;
      return (
        <Group listening={false}>
          <Rect
            x={aoePosition.x * cellSize}
            y={aoePosition.y * cellSize}
            width={squareSize}
            height={squareSize}
            fill={color}
            stroke="#ff5555"
            strokeWidth={2}
            opacity={0.7}
            listening={false}
          />
          <Text
            x={aoePosition.x * cellSize + 5}
            y={aoePosition.y * cellSize + 5}
            text={`${size * squareFeetPerCell}ft cube`}
            fontSize={14}
            fill="white"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );
    }
    return null;
  };

  // Render the grid
  const renderGrid = () => {
    const grid = [];
    const { cellSize, showGrid, showCoordinates, gridColor } = gridConfig;

    for (let x = 0; x < gridConfig.width; x++) {
      for (let y = 0; y < gridConfig.height; y++) {
        // Grid cell
        if (showGrid) {
          grid.push(
            <Rect
              key={`grid-${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              stroke={gridColor}
              strokeWidth={1}
              fill="transparent"
              onClick={() => setSelectedCharacter(null)}
            />
          );
        }

        // Coordinates
        if (showCoordinates && (x === 0 || y === 0)) {
          grid.push(
            <Text
              key={`coord-${x}-${y}`}
              x={x * cellSize + 5}
              y={y * cellSize + 5}
              text={`${x},${y}`}
              fontSize={10}
              fill="#777"
              opacity={0.7}
            />
          );
        }
      }
    }

    return grid;
  };

  // Render characters
  const renderCharacters = () => {
    return characters.map((char) => {
      const isSelected = selectedCharacter === char.id;
      const isHovered = hoveredCharId === char.id;
      const isDragging = draggingCharId === char.id;
      const tokenSize = char.size * gridConfig.cellSize;
      const x = char.x * gridConfig.cellSize;
      const y = char.y * gridConfig.cellSize;

      return (
        <Group
          key={char.id}
          x={x}
          y={y}
          draggable
          onDragStart={() => {
            setDraggingCharId(char.id);
            setSelectedCharacter(char.id);
          }}
          onDragMove={(e) => {
            const stage = e.target.getStage();
            const pointerPos = stage.getPointerPosition();
            // Calculate distance from original position
            const startX = char.x * gridConfig.cellSize + tokenSize / 2;
            const startY = char.y * gridConfig.cellSize + tokenSize / 2;
            const distance = Math.sqrt(
              Math.pow(pointerPos.x - startX, 2) +
                Math.pow(pointerPos.y - startY, 2)
            );
            setDistanceInfo({
              from: { x: char.x, y: char.y },
              to: {
                x: Math.round(pointerPos.x / gridConfig.cellSize),
                y: Math.round(pointerPos.y / gridConfig.cellSize),
              },
              distance: distance / gridConfig.cellSize,
            });
          }}
          onDragEnd={(e) => {
            const cellSize = gridConfig.cellSize;
            const newX = Math.round(e.target.x() / cellSize);
            const newY = Math.round(e.target.y() / cellSize);
            setCharactersAndPersist(
              characters.map((c) =>
                c.id === char.id ? { ...c, x: newX, y: newY } : c
              )
            );
            setDraggingCharId(null);
            setDistanceInfo(null);
          }}
        >
          <Image
            image={(() => {
              const img = new window.Image();
              img.src = char.image || defaultTokenImage;
              return img;
            })()}
            width={tokenSize}
            height={tokenSize}
            listening={false}
            shadowForStrokeEnabled={false}
          />
          <Rect
            width={tokenSize}
            height={tokenSize}
            fill={isSelected ? "rgba(255, 235, 59, 0.3)" : "rgba(0,0,0,0.01)"}
            cornerRadius={8}
            stroke={isSelected ? "#ffeb3b" : "#6464c8"}
            strokeWidth={2}
            onClick={() => setSelectedCharacter(char.id)}
            onMouseEnter={() => setHoveredCharId(char.id)}
            onMouseLeave={() => setHoveredCharId(null)}
            shadowBlur={isDragging ? 16 : 0}
            shadowColor={isDragging ? "#2196F3" : undefined}
            shadowOpacity={isDragging ? 0.5 : 0}
            listening={true}
          />
          {isSelected && (
            <Rect
              width={tokenSize}
              height={tokenSize}
              cornerRadius={8}
              stroke="#ffeb3b"
              strokeWidth={3}
              fill="transparent"
              listening={false}
            />
          )}
          <Group x={5} y={tokenSize - 15} listening={false}>
            <Rect
              width={tokenSize - 10}
              height={10}
              fill="#333"
              cornerRadius={4}
            />
            <Rect
              width={((tokenSize - 10) * char.hp) / char.maxHp}
              height={10}
              fill={
                char.hp > char.maxHp / 2
                  ? "#4CAF50"
                  : char.hp > char.maxHp / 4
                  ? "#FFC107"
                  : "#F44336"
              }
              cornerRadius={4}
            />
            <Text
              text={`${char.hp}/${char.maxHp}`}
              fontSize={10}
              fill="white"
              width={tokenSize - 10}
              height={10}
              align="center"
              verticalAlign="middle"
            />
          </Group>
          {/* Only show overlays if hovered and not dragging */}
          {isHovered && !isDragging && (
            <Group listening={false}>
              <Label x={5} y={5} listening={false}>
                <Tag fill="#2196F3" cornerRadius={10} listening={false} />
                <Text
                  text={`AC ${char.ac}`}
                  fontSize={12}
                  fill="white"
                  padding={5}
                  listening={false}
                />
              </Label>
              {char.conditions.length > 0 && (
                <Group x={5} y={25} listening={false}>
                  {char.conditions.map((condition, idx) => (
                    <Label key={idx} y={idx * 20} listening={false}>
                      <Tag
                        fill="rgba(200, 0, 0, 0.7)"
                        cornerRadius={4}
                        listening={false}
                      />
                      <Text
                        text={condition}
                        fontSize={10}
                        fill="white"
                        padding={3}
                        listening={false}
                      />
                    </Label>
                  ))}
                </Group>
              )}
            </Group>
          )}
        </Group>
      );
    });
  };

  // Render distance info
  const renderDistanceInfo = () => {
    if (!distanceInfo || !draggingCharId) return null;
    const startX =
      distanceInfo.from.x * gridConfig.cellSize + gridConfig.cellSize / 2;
    const startY =
      distanceInfo.from.y * gridConfig.cellSize + gridConfig.cellSize / 2;
    const endX = distanceInfo.pixel
      ? distanceInfo.pixel.x
      : distanceInfo.to.x * gridConfig.cellSize + gridConfig.cellSize / 2;
    const endY = distanceInfo.pixel
      ? distanceInfo.pixel.y
      : distanceInfo.to.y * gridConfig.cellSize + gridConfig.cellSize / 2;
    // Round to nearest 0.5
    const roundedDist = Math.round(distanceInfo.distance * 2) / 2;
    return (
      <Group listening={false}>
        <Line
          points={[startX, startY, endX, endY]}
          stroke="#ff9800"
          strokeWidth={2}
          dash={[5, 5]}
          listening={false}
        />
        <Label
          x={(startX + endX) / 2}
          y={(startY + endY) / 2}
          opacity={0.9}
          listening={false}
        >
          <Tag fill="#ff9800" cornerRadius={4} listening={false} />
          <Text
            text={`${roundedDist * squareFeetPerCell} ft`}
            fontSize={14}
            fill="white"
            padding={5}
            listening={false}
          />
        </Label>
      </Group>
    );
  };

  // Render measurement tool line
  const renderMeasurementLine = () => {
    if (measurementPoints.length !== 2) return null;
    const [p1, p2] = measurementPoints;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Round to nearest 0.5
    const dist =
      Math.round((Math.sqrt(dx * dx + dy * dy) / gridConfig.cellSize) * 2) / 2;
    return (
      <Group listening={false}>
        <Line
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke="#00e676"
          strokeWidth={2}
          dash={[4, 4]}
          listening={false}
        />
        <Label
          x={(p1.x + p2.x) / 2}
          y={(p1.y + p2.y) / 2}
          opacity={0.9}
          listening={false}
        >
          <Tag fill="#00e676" cornerRadius={4} listening={false} />
          <Text
            text={`${dist * squareFeetPerCell} ft`}
            fontSize={14}
            fill="white"
            padding={5}
            listening={false}
          />
        </Label>
      </Group>
    );
  };

  // Add stat to newCharacter
  const addNewStat = (type) => {
    setNewCharacter((prev) => ({
      ...prev,
      stats: [
        ...prev.stats,
        {
          id: Date.now() + Math.floor(Math.random() * 1000000),
          title: "",
          type,
          value:
            type === "checkboxes"
              ? [false, false, false]
              : type === "counter" || type === "number"
              ? 0
              : "",
          count: type === "checkboxes" ? 3 : undefined,
        },
      ],
    }));
  };
  // Remove stat from newCharacter
  const removeNewStat = (id) => {
    setNewCharacter((prev) => ({
      ...prev,
      stats: prev.stats.filter((s) => s.id !== id),
    }));
  };
  // Update stat in newCharacter
  const updateNewStat = (id, patch) => {
    setNewCharacter((prev) => ({
      ...prev,
      stats: prev.stats.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  // --- Custom Stat Add Row Component ---
  const CustomStatAddRow = ({ onAdd }) => {
    const [type, setType] = useState("counter");
    return (
      <div className="custom-stats-add-row">
        <select
          className="custom-stat-type-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="counter">Counter</option>
          <option value="checkboxes">Checkboxes</option>
          <option value="text">Text</option>
        </select>
        <button
          type="button"
          className="custom-stat-add-btn"
          onClick={() => onAdd(type)}
        >
          + Add Stat
        </button>
      </div>
    );
  };

  return (
    <div className="dnd-grid-container">
      <div className="toolbar">
        <div className="grid-controls">
          <h3>Battlemap Tools</h3>

          <div className="control-group">
            <label>Grid Width: {gridConfig.width}</label>
            <input
              type="range"
              min="5"
              max="40"
              value={gridConfig.width}
              onChange={(e) =>
                setGridConfig({
                  ...gridConfig,
                  width: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="control-group">
            <label>Grid Height: {gridConfig.height}</label>
            <input
              type="range"
              min="5"
              max="40"
              value={gridConfig.height}
              onChange={(e) =>
                setGridConfig({
                  ...gridConfig,
                  height: parseInt(e.target.value),
                })
              }
            />
          </div>

          <div className="control-group">
            <label>Cell Size: {gridConfig.cellSize}px</label>
            <input
              type="range"
              min="30"
              max="100"
              value={gridConfig.cellSize}
              onChange={(e) =>
                setGridConfig({
                  ...gridConfig,
                  cellSize: parseInt(e.target.value),
                })
              }
            />
          </div>

          {/* New: Square feet per cell */}
          <div className="control-group">
            <label>Square Size (ft):</label>
            <input
              type="number"
              min={1}
              max={100}
              value={squareFeetPerCell}
              onChange={(e) =>
                setSquareFeetPerCell(parseInt(e.target.value) || 1)
              }
              style={{ width: 60 }}
            />
          </div>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={gridConfig.showGrid}
                onChange={(e) =>
                  setGridConfig({ ...gridConfig, showGrid: e.target.checked })
                }
              />
              Show Grid
            </label>
          </div>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={gridConfig.showCoordinates}
                onChange={(e) =>
                  setGridConfig({
                    ...gridConfig,
                    showCoordinates: e.target.checked,
                  })
                }
              />
              Show Coordinates
            </label>
          </div>
        </div>

        <div className="aoe-controls">
          <h3>AOE Spell Indicator</h3>

          <div className="control-group">
            <label>
              <input
                type="checkbox"
                checked={aoeTool.active}
                onChange={(e) =>
                  setAoeTool({ ...aoeTool, active: e.target.checked })
                }
              />
              Enable AOE Preview
            </label>
          </div>

          {aoeTool.active && (
            <>
              <div className="control-group">
                <label>Shape:</label>
                <select
                  value={aoeTool.shape}
                  onChange={(e) =>
                    setAoeTool({ ...aoeTool, shape: e.target.value })
                  }
                >
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="cone">Cone</option>
                </select>
              </div>

              <div className="control-group">
                <label>Size: {aoeTool.size * 5} ft</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={aoeTool.size}
                  onChange={(e) =>
                    setAoeTool({ ...aoeTool, size: parseInt(e.target.value) })
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className="character-controls">
          <h3>Character Tools</h3>

          <div className="control-group">
            <button
              className={measurementMode ? "active" : ""}
              onClick={() => {
                setMeasurementMode(!measurementMode);
                if (measurementMode) setMeasurementPoints([]);
              }}
            >
              {measurementMode ? "Exit Measurement" : "Distance Tool"}
            </button>
          </div>
        </div>

        <div className="add-character">
          <h3>Add Character</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newCharacter.name}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, name: e.target.value })
              }
              placeholder="Character name"
            />
          </div>
          <div className="form-group">
            <label>HP</label>
            <input
              type="number"
              min={0}
              value={newCharacter.hp}
              onChange={(e) =>
                setNewCharacter({
                  ...newCharacter,
                  hp: parseInt(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
            /
            <input
              type="number"
              min={1}
              value={newCharacter.maxHp}
              onChange={(e) =>
                setNewCharacter({
                  ...newCharacter,
                  maxHp: parseInt(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </div>
          <div className="form-group">
            <label>AC</label>
            <input
              type="number"
              min={0}
              value={newCharacter.ac}
              onChange={(e) =>
                setNewCharacter({
                  ...newCharacter,
                  ac: parseInt(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </div>
          <div className="form-group">
            <label>Token Size</label>
            <input
              type="number"
              min={1}
              max={4}
              value={newCharacter.size}
              onChange={(e) =>
                setNewCharacter({
                  ...newCharacter,
                  size: parseInt(e.target.value),
                })
              }
              style={{ width: 60 }}
            />
          </div>
          <div className="form-group">
            <label>Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleImageUpload(e, setNewCharacter, newCharacter)
              }
            />
            {newCharacter.image && (
              <img
                src={newCharacter.image}
                alt="preview"
                style={{
                  width: 60,
                  height: 60,
                  objectFit: "cover",
                  marginTop: 8,
                }}
              />
            )}
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={newCharacter.isHighGround}
                onChange={(e) =>
                  setNewCharacter({
                    ...newCharacter,
                    isHighGround: e.target.checked,
                  })
                }
              />
              High Ground Position
            </label>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={newCharacter.notes}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, notes: e.target.value })
              }
              rows={2}
              style={{ width: "100%" }}
            />
          </div>
          <div className="form-group">
            <label>Custom Stats</label>
            <div className="custom-stats-list">
              {newCharacter.stats.map((stat, idx) => (
                <div key={stat.id} className="custom-stat-row">
                  <input
                    type="text"
                    placeholder="Title"
                    value={stat.title}
                    onChange={(e) =>
                      updateNewStat(stat.id, { title: e.target.value })
                    }
                    className="custom-stat-title"
                  />
                  <span className="custom-stat-type">{stat.type}</span>
                  {stat.type === "counter" && (
                    <input
                      type="number"
                      value={stat.value || 0}
                      onChange={(e) =>
                        updateNewStat(stat.id, {
                          value: parseInt(e.target.value),
                        })
                      }
                      className="custom-stat-input"
                    />
                  )}
                  {stat.type === "checkboxes" && (
                    <>
                      <div className="custom-stat-checkboxes-controls">
                        <button
                          type="button"
                          className="custom-stat-checkbox-remove"
                          onClick={() => {
                            if ((stat.count || 3) > 1) {
                              const newCount = (stat.count || 3) - 1;
                              updateNewStat(stat.id, {
                                count: newCount,
                                value: (stat.value || []).slice(0, newCount),
                              });
                            }
                          }}
                          disabled={(stat.count || 3) <= 1}
                        >
                          -
                        </button>
                        <span className="custom-stat-checkbox-count">
                          {stat.count || 3}
                        </span>
                        <button
                          type="button"
                          className="custom-stat-checkbox-add"
                          onClick={() => {
                            if ((stat.count || 3) < 10) {
                              const newCount = (stat.count || 3) + 1;
                              const oldVals = stat.value || [];
                              const newVals = Array(newCount)
                                .fill(false)
                                .map((v, i) => oldVals[i] || false);
                              updateNewStat(stat.id, {
                                count: newCount,
                                value: newVals,
                              });
                            }
                          }}
                          disabled={(stat.count || 3) >= 10}
                        >
                          +
                        </button>
                      </div>
                      <div className="custom-stat-checkboxes">
                        {Array.from({ length: stat.count || 3 }).map((_, i) => (
                          <input
                            key={i}
                            type="checkbox"
                            checked={!!(stat.value && stat.value[i])}
                            onChange={(e) =>
                              updateNewStat(stat.id, {
                                value: stat.value.map((v, vi) =>
                                  vi === i ? e.target.checked : v
                                ),
                              })
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {stat.type === "text" && (
                    <input
                      type="text"
                      value={stat.value || ""}
                      onChange={(e) =>
                        updateNewStat(stat.id, { value: e.target.value })
                      }
                      className="custom-stat-input"
                    />
                  )}
                  <button
                    type="button"
                    className="custom-stat-remove"
                    onClick={() => removeNewStat(stat.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <CustomStatAddRow onAdd={addNewStat} />
            </div>
          </div>
          <button
            onClick={() => {
              const center = getGridCenter(
                gridConfig.width,
                gridConfig.height,
                newCharacter.size
              );
              const newChar = {
                id: Date.now() + Math.floor(Math.random() * 1000000), // ensure unique id
                ...newCharacter,
                x: Math.round(center.x),
                y: Math.round(center.y),
                size: parseInt(newCharacter.size),
                hp: parseInt(newCharacter.hp),
                maxHp: parseInt(newCharacter.maxHp),
                ac: parseInt(newCharacter.ac),
                isHighGround: !!newCharacter.isHighGround,
                conditions: [],
                image: newCharacter.image || null,
                notes: newCharacter.notes || "",
                stats: newCharacter.stats.map((s) => ({ ...s })),
              };
              setCharactersAndPersist([...characters, newChar]);
              setNewCharacter({
                name: "",
                x: center.x,
                y: center.y,
                size: 1,
                hp: 10,
                maxHp: 10,
                ac: 10,
                isHighGround: false,
                conditions: [],
                image: null,
                notes: "",
                stats: [],
              });
            }}
          >
            Add to Map
          </button>
        </div>
      </div>

      <div className="map-container" onMouseMove={handleGridMouseMove}>
        <Stage
          width={gridWidth}
          height={gridHeight}
          ref={stageRef}
          {...(measurementMode || (aoeTool.active && aoeTool.shape === "cone")
            ? {
                onClick: measurementMode
                  ? (e) => {
                      handleStageClick(e);
                    }
                  : undefined,
                onMouseDown:
                  aoeTool.active && aoeTool.shape === "cone"
                    ? handleAoeStageMouseDown
                    : undefined,
                onMouseMove:
                  aoeTool.active && aoeTool.shape === "cone"
                    ? handleAoeStageMouseMove
                    : undefined,
                onMouseUp:
                  aoeTool.active && aoeTool.shape === "cone"
                    ? handleAoeStageMouseUp
                    : undefined,
              }
            : {})}
        >
          <Layer ref={gridLayerRef}>
            {/* Background */}
            <Rect
              width={gridWidth}
              height={gridHeight}
              fill={gridConfig.backgroundColor}
              onClick={() => setSelectedCharacter(null)}
            />

            {/* Grid */}
            {renderGrid()}

            {/* AOE Indicator */}
            {renderAoeIndicator()}

            {/* Characters */}
            {renderCharacters()}

            {/* Distance info */}
            {renderDistanceInfo()}

            {/* Measurement tool line */}
            {renderMeasurementLine()}
          </Layer>
        </Stage>
      </div>

      {selectedCharacter &&
        characters.some((c) => c.id === selectedCharacter) && (
          <div className="character-details">
            <h3>Character Details</h3>
            {characters
              .filter((c) => c.id === selectedCharacter)
              .map((char) => (
                <div key={char.id} className="character-card">
                  <div className="character-header">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) =>
                        setCharactersAndPersist(
                          characters.map((c) =>
                            c.id === char.id
                              ? { ...c, name: e.target.value }
                              : c
                          )
                        )
                      }
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        width: "100%",
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? { ...c, image: ev.target.result }
                                : c
                            )
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {char.image && (
                      <img
                        src={char.image}
                        alt="preview"
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: "cover",
                          marginTop: 8,
                        }}
                      />
                    )}
                  </div>
                  <div className="stats">
                    <div className="stat">
                      <label>Size</label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={char.size}
                        onChange={(e) =>
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? { ...c, size: parseInt(e.target.value) }
                                : c
                            )
                          )
                        }
                        style={{ width: 50 }}
                      />
                    </div>
                    <div className="stat">
                      <label>High Ground</label>
                      <input
                        type="checkbox"
                        checked={char.isHighGround}
                        onChange={(e) =>
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? { ...c, isHighGround: e.target.checked }
                                : c
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="stat hp-row">
                    <label>HP</label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="number"
                        min={0}
                        value={char.hp}
                        onChange={(e) =>
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? { ...c, hp: parseInt(e.target.value) }
                                : c
                            )
                          )
                        }
                        style={{ width: 60 }}
                      />
                      <span style={{ fontWeight: 600, color: "#b0c4d4" }}>
                        /
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={char.maxHp}
                        onChange={(e) =>
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? { ...c, maxHp: parseInt(e.target.value) }
                                : c
                            )
                          )
                        }
                        style={{ width: 60 }}
                      />
                    </div>
                  </div>
                  <div className="stat">
                    <label>AC</label>
                    <input
                      type="number"
                      min={0}
                      value={char.ac}
                      onChange={(e) =>
                        setCharactersAndPersist(
                          characters.map((c) =>
                            c.id === char.id
                              ? { ...c, ac: parseInt(e.target.value) }
                              : c
                          )
                        )
                      }
                      style={{ width: 60 }}
                    />
                  </div>
                  <div className="conditions">
                    <h4>Conditions</h4>
                    <div className="condition-buttons">
                      {[
                        "prone",
                        "restrained",
                        "poisoned",
                        "slowed",
                        "stunned",
                      ].map((condition) => (
                        <button
                          key={condition}
                          className={
                            char.conditions.includes(condition) ? "active" : ""
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (char.conditions.includes(condition)) {
                              setCharactersAndPersist(
                                characters.map((c) =>
                                  c.id === char.id
                                    ? {
                                        ...c,
                                        conditions: c.conditions.filter(
                                          (cnd) => cnd !== condition
                                        ),
                                      }
                                    : c
                                )
                              );
                            } else {
                              setCharactersAndPersist(
                                characters.map((c) =>
                                  c.id === char.id
                                    ? {
                                        ...c,
                                        conditions: [
                                          ...c.conditions,
                                          condition,
                                        ],
                                      }
                                    : c
                                )
                              );
                            }
                          }}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={char.notes}
                      onChange={(e) =>
                        setCharactersAndPersist(
                          characters.map((c) =>
                            c.id === char.id
                              ? { ...c, notes: e.target.value }
                              : c
                          )
                        )
                      }
                      rows={2}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Custom Stats</label>
                    <div className="custom-stats-list">
                      {char.stats && char.stats.length > 0 ? (
                        char.stats.map((stat, idx) => (
                          <div
                            key={stat.id}
                            className="custom-stat-row custom-stat-row-vertical"
                          >
                            <div className="custom-stat-title-large">
                              {stat.title || (
                                <span style={{ color: "#888" }}>Untitled</span>
                              )}
                            </div>
                            <div className="custom-stat-value-control">
                              {stat.type === "counter" && (
                                <input
                                  type="number"
                                  value={stat.value || 0}
                                  onChange={(e) =>
                                    setCharactersAndPersist(
                                      characters.map((c) =>
                                        c.id === char.id
                                          ? {
                                              ...c,
                                              stats: c.stats.map((s, i) =>
                                                i === idx
                                                  ? {
                                                      ...s,
                                                      value: parseInt(
                                                        e.target.value
                                                      ),
                                                    }
                                                  : s
                                              ),
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className="custom-stat-input"
                                />
                              )}
                              {stat.type === "number" && (
                                <input
                                  type="number"
                                  value={stat.value || 0}
                                  onChange={(e) =>
                                    setCharactersAndPersist(
                                      characters.map((c) =>
                                        c.id === char.id
                                          ? {
                                              ...c,
                                              stats: c.stats.map((s, i) =>
                                                i === idx
                                                  ? {
                                                      ...s,
                                                      value: parseInt(
                                                        e.target.value
                                                      ),
                                                    }
                                                  : s
                                              ),
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className="custom-stat-input"
                                />
                              )}
                              {stat.type === "checkboxes" && (
                                <>
                                  <div className="custom-stat-checkboxes-controls">
                                    <button
                                      type="button"
                                      className="custom-stat-checkbox-remove"
                                      onClick={() => {
                                        if ((stat.count || 3) > 1) {
                                          const newCount =
                                            (stat.count || 3) - 1;
                                          setCharactersAndPersist(
                                            characters.map((c) =>
                                              c.id === char.id
                                                ? {
                                                    ...c,
                                                    stats: c.stats.map((s, i) =>
                                                      i === idx
                                                        ? {
                                                            ...s,
                                                            count: newCount,
                                                            value: (
                                                              s.value || []
                                                            ).slice(
                                                              0,
                                                              newCount
                                                            ),
                                                          }
                                                        : s
                                                    ),
                                                  }
                                                : c
                                            )
                                          );
                                        }
                                      }}
                                      disabled={(stat.count || 3) <= 1}
                                    >
                                      -
                                    </button>
                                    <span className="custom-stat-checkbox-count">
                                      {stat.count || 3}
                                    </span>
                                    <button
                                      type="button"
                                      className="custom-stat-checkbox-add"
                                      onClick={() => {
                                        if ((stat.count || 3) < 10) {
                                          const newCount =
                                            (stat.count || 3) + 1;
                                          setCharactersAndPersist(
                                            characters.map((c) =>
                                              c.id === char.id
                                                ? {
                                                    ...c,
                                                    stats: c.stats.map((s, i) =>
                                                      i === idx
                                                        ? {
                                                            ...s,
                                                            count: newCount,
                                                            value: Array(
                                                              newCount
                                                            )
                                                              .fill(false)
                                                              .map(
                                                                (v, i) =>
                                                                  (s.value ||
                                                                    [])[i] ||
                                                                  false
                                                              ),
                                                          }
                                                        : s
                                                    ),
                                                  }
                                                : c
                                            )
                                          );
                                        }
                                      }}
                                      disabled={(stat.count || 3) >= 10}
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className="custom-stat-checkboxes">
                                    {Array.from({
                                      length: stat.count || 3,
                                    }).map((_, i) => (
                                      <input
                                        key={i}
                                        type="checkbox"
                                        checked={
                                          !!(stat.value && stat.value[i])
                                        }
                                        onChange={(e) =>
                                          setCharactersAndPersist(
                                            characters.map((c) =>
                                              c.id === char.id
                                                ? {
                                                    ...c,
                                                    stats: c.stats.map(
                                                      (s, si) =>
                                                        si === idx
                                                          ? {
                                                              ...s,
                                                              value:
                                                                s.value.map(
                                                                  (v, vi) =>
                                                                    vi === i
                                                                      ? e.target
                                                                          .checked
                                                                      : v
                                                                ),
                                                            }
                                                          : s
                                                    ),
                                                  }
                                                : c
                                            )
                                          )
                                        }
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                              {stat.type === "text" && (
                                <input
                                  type="text"
                                  value={stat.value || ""}
                                  onChange={(e) =>
                                    setCharactersAndPersist(
                                      characters.map((c) =>
                                        c.id === char.id
                                          ? {
                                              ...c,
                                              stats: c.stats.map((s, i) =>
                                                i === idx
                                                  ? {
                                                      ...s,
                                                      value: e.target.value,
                                                    }
                                                  : s
                                              ),
                                            }
                                          : c
                                      )
                                    )
                                  }
                                  className="custom-stat-input"
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              className="custom-stat-remove"
                              onClick={() =>
                                setCharactersAndPersist(
                                  characters.map((c) =>
                                    c.id === char.id
                                      ? {
                                          ...c,
                                          stats: c.stats.filter(
                                            (s, i) => i !== idx
                                          ),
                                        }
                                      : c
                                  )
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#888" }}>No custom stats</div>
                      )}
                      <CustomStatAddRow
                        onAdd={(type) => {
                          const title = window.prompt("Enter stat name:");
                          if (!title) return;
                          setCharactersAndPersist(
                            characters.map((c) =>
                              c.id === char.id
                                ? {
                                    ...c,
                                    stats: [
                                      ...c.stats,
                                      {
                                        id:
                                          Date.now() +
                                          Math.floor(Math.random() * 1000000),
                                        title,
                                        type,
                                        value:
                                          type === "checkboxes"
                                            ? [false, false, false]
                                            : type === "counter" ||
                                              type === "number"
                                            ? 0
                                            : "",
                                        count:
                                          type === "checkboxes" ? 3 : undefined,
                                      },
                                    ],
                                  }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                  {!MAIN_CHARACTERS.some((mc) => mc.name === char.name) && (
                    <button
                      className="remove-btn"
                      onClick={() => {
                        setCharactersAndPersist(
                          characters.filter((c) => c.id !== char.id)
                        );
                        setSelectedCharacter(null);
                      }}
                    >
                      Remove from Map
                    </button>
                  )}
                  <button
                    className="duplicate-btn"
                    onClick={() => {
                      const newChar = {
                        ...char,
                        id: Date.now() + Math.floor(Math.random() * 1000000),
                        name: char.name + " (Copy)",
                      };
                      setCharactersAndPersist([...characters, newChar]);
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    Duplicate
                  </button>
                </div>
              ))}
          </div>
        )}
    </div>
  );
};

export default DnDGrid;
