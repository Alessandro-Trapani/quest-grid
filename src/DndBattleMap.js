import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import "./styles.css";

const DndBattleMap = () => {
  // --- Predefined Characters ---
  const predefinedCharacters = [
    {
      id: "nauru",
      name: "Nauru",
      image: "/assets/characters/nauru.jpg",
      color: "#FF5252",
      position: { x: 5, y: 5 },
      notes: "",
      stats: [],
    },
    {
      id: "martin",
      name: "Martin",
      image: "/assets/characters/martin.jpg",
      color: "#448AFF",
      position: { x: 8, y: 5 },
      notes: "",
      stats: [],
    },
    {
      id: "eredin",
      name: "Eredin",
      image: "/assets/characters/eredin.jpg",
      color: "#69F0AE",
      position: { x: 11, y: 5 },
      notes: "",
      stats: [],
    },
    {
      id: "hardek",
      name: "Hardek",
      image: "/assets/characters/hardek.jpg",
      color: "#FFD740",
      position: { x: 14, y: 5 },
      notes: "",
      stats: [],
    },
    {
      id: "lexias",
      name: "Lexias",
      image: "/assets/characters/lexias.jpg",
      color: "#E040FB",
      position: { x: 17, y: 5 },
      notes: "",
      stats: [],
    },
  ];

  // --- State Variables ---
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    id: "",
    name: "",
    image: null,
    color: "#FF5252",
    position: { x: 0, y: 0 },
    notes: "",
    totalHp: 100,
    currentHp: 100,
    stats: [],
  });
  const [hpChangeAmount, setHpChangeAmount] = useState("");
  const [gridHeight, setGridHeight] = useState(20);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [squareSize, setSquareSize] = useState(1.5); // Default square size in meters

  // Dragging state
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(null);

  // AoE state
  const [aoeShape, setAoeShape] = useState(null); // 'cone', 'circle', 'square', 'line'
  const [aoeSize, setAoeSize] = useState(1);
  const [aoeOrigin, setAoeOrigin] = useState(null);
  const [aoeTarget, setAoeTarget] = useState(null);

  const gridRef = useRef(null);
  const gridWidth = 60;

  // --- Local Storage Management ---
  useEffect(() => {
    const savedCustomCharacters = localStorage.getItem("dndCustomCharacters");
    const savedOverrides = localStorage.getItem("dndPredefinedOverrides");
    const savedGridHeight = localStorage.getItem("dndGridHeight");
    const savedSquareSize = localStorage.getItem("dndSquareSize");

    // Load custom characters
    let loadedCustomCharacters = [];
    if (savedCustomCharacters) {
      try {
        loadedCustomCharacters = JSON.parse(savedCustomCharacters);
      } catch (error) {
        console.error("Failed to parse saved custom characters:", error);
        localStorage.removeItem("dndCustomCharacters");
      }
    }

    // Load predefined character overrides
    let loadedOverrides = {};
    if (savedOverrides) {
      try {
        loadedOverrides = JSON.parse(savedOverrides);
      } catch (error) {
        console.error("Failed to parse saved overrides:", error);
        localStorage.removeItem("dndPredefinedOverrides");
      }
    }

    // Apply overrides to predefined characters
    const mergedPredefined = predefinedCharacters.map((preChar) => {
      const override = loadedOverrides[preChar.id];
      return override
        ? {
            ...preChar,
            position: override.position,
            notes: override.notes,
            totalHp: override.totalHp !== undefined ? override.totalHp : 1,
            currentHp:
              override.currentHp !== undefined ? override.currentHp : 1,
            stats: override.stats,
          }
        : {
            ...preChar,
            totalHp: 1,
            currentHp: 1,
          };
    });

    setCharacters([...mergedPredefined, ...loadedCustomCharacters]);

    if (savedGridHeight) {
      setGridHeight(parseInt(savedGridHeight, 10));
    }

    if (savedSquareSize) {
      setSquareSize(parseFloat(savedSquareSize));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Separate characters into custom and predefined
    const customCharacters = characters.filter(
      (char) => !predefinedCharacters.some((pre) => pre.id === char.id)
    );

    // Create overrides for predefined characters
    const predefinedOverrides = {};
    predefinedCharacters.forEach((preChar) => {
      const currentChar = characters.find((char) => char.id === preChar.id);
      if (currentChar) {
        predefinedOverrides[preChar.id] = {
          position: currentChar.position,
          notes: currentChar.notes,
          totalHp: currentChar.totalHp,
          currentHp: currentChar.currentHp,
          stats: currentChar.stats,
        };
      }
    });

    // Save to localStorage
    localStorage.setItem(
      "dndCustomCharacters",
      JSON.stringify(customCharacters)
    );
    localStorage.setItem(
      "dndPredefinedOverrides",
      JSON.stringify(predefinedOverrides)
    );
    localStorage.setItem("dndGridHeight", gridHeight.toString());
    localStorage.setItem("dndSquareSize", squareSize.toString());
  }, [characters, gridHeight, squareSize, isLoading]);

  // --- Grid and Character Interaction Logic ---
  const calculateSquareSize = () => {
    if (!gridRef.current) return 20;
    const gridWidthPx = gridRef.current.clientWidth;
    return Math.max(15, Math.floor(gridWidthPx / gridWidth));
  };

  const squareSizePx = calculateSquareSize();

  // Calculate distance between two positions in meters
  const calculateDistance = (pos1, pos2) => {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const distanceInSquares = Math.sqrt(dx * dx + dy * dy);
    return (distanceInSquares * squareSize).toFixed(1);
  };

  const handleGridClick = (e) => {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / squareSizePx);
    const y = Math.floor((e.clientY - rect.top) / squareSizePx);

    // Handle AoE placement
    if (aoeShape) {
      if (!aoeOrigin) {
        setAoeOrigin({ x, y });
      } else {
        setAoeTarget({ x, y });
      }
      return;
    }

    // Existing character placement logic
    if (!isModalOpen && isCreating && newCharacter.name) {
      const characterToAdd = {
        ...newCharacter,
        id: uuidv4(),
        position: { x, y },
        totalHp: parseInt(newCharacter.totalHp) || 0,
        currentHp: parseInt(newCharacter.totalHp) || 0,
        stats: newCharacter.stats.map((stat) => ({
          ...stat,
          value:
            stat.type === "counter" ? parseInt(stat.value) || 0 : stat.value,
        })),
      };

      setCharacters([...characters, characterToAdd]);
      setIsCreating(false);
      setNewCharacter({
        id: "",
        name: "",
        image: null,
        color: "#FF5252",
        position: { x: 0, y: 0 },
        notes: "",
        totalHp: 100,
        currentHp: 100,
        stats: [],
      });
    }
  };

  // Calculate affected squares for AoE shapes
  const getAffectedSquares = () => {
    if (!aoeShape || !aoeOrigin) return [];

    const affected = [];
    const size = aoeSize;

    if (aoeShape === "circle") {
      for (let x = -size; x <= size; x++) {
        for (let y = -size; y <= size; y++) {
          if (x * x + y * y <= size * size) {
            affected.push({ x: aoeOrigin.x + x, y: aoeOrigin.y + y });
          }
        }
      }
    } else if (aoeShape === "square") {
      for (let x = -size; x <= size; x++) {
        for (let y = -size; y <= size; y++) {
          affected.push({ x: aoeOrigin.x + x, y: aoeOrigin.y + y });
        }
      }
    } else if (aoeShape === "cone" && aoeTarget) {
      const dx = aoeTarget.x - aoeOrigin.x;
      const dy = aoeTarget.y - aoeOrigin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const dirX = dx / distance;
        const dirY = dy / distance;

        for (let r = 0; r <= size; r++) {
          for (let a = -size; a <= size; a++) {
            if (Math.abs(a) <= r) {
              const x = Math.round(aoeOrigin.x + r * dirX - a * dirY);
              const y = Math.round(aoeOrigin.y + r * dirY + a * dirX);
              affected.push({ x, y });
            }
          }
        }
      }
    } else if (aoeShape === "line" && aoeTarget) {
      const dx = aoeTarget.x - aoeOrigin.x;
      const dy = aoeTarget.y - aoeOrigin.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));

      for (let i = 0; i <= steps; i++) {
        const x = Math.round(aoeOrigin.x + (dx * i) / steps);
        const y = Math.round(aoeOrigin.y + (dy * i) / steps);
        affected.push({ x, y });
      }
    }

    return affected.filter(
      (point) =>
        point.x >= 0 &&
        point.x < gridWidth &&
        point.y >= 0 &&
        point.y < gridHeight
    );
  };

  const startDragging = (e, character) => {
    if (isModalOpen) return;

    e.preventDefault();
    setIsDragging(true);
    setSelectedCharacter(character);
    setDragStartPosition({ ...character.position });

    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    const tokenX = character.position.x * squareSizePx;
    const tokenY = character.position.y * squareSizePx;

    setDragOffset({
      x: e.clientX - rect.left - tokenX,
      y: e.clientY - rect.top - tokenY,
    });
  };

  const handleDragging = (e) => {
    if (!isDragging || !selectedCharacter) return;

    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    let newX = Math.floor(
      (e.clientX - rect.left - dragOffset.x) / squareSizePx
    );
    let newY = Math.floor((e.clientY - rect.top - dragOffset.y) / squareSizePx);

    newX = Math.max(0, Math.min(gridWidth - 1, newX));
    newY = Math.max(0, Math.min(gridHeight - 1, newY));

    setHoverPosition({ x: newX, y: newY });

    const updatedCharacters = characters.map((char) =>
      char.id === selectedCharacter.id
        ? { ...char, position: { x: newX, y: newY } }
        : char
    );

    setCharacters(updatedCharacters);
    setSelectedCharacter((prevSelected) => ({
      ...prevSelected,
      position: { x: newX, y: newY },
    }));
  };

  const stopDragging = () => {
    setIsDragging(false);
    setDragStartPosition(null);
    setHoverPosition(null);
  };

  // --- Character Modal and Data Management Functions ---
  const openCreateModal = () => {
    setNewCharacter({
      id: uuidv4(),
      name: "",
      image: null,
      color: "#FF5252",
      position: { x: 0, y: 0 },
      notes: "",
      totalHp: 100,
      currentHp: 100,
      stats: [],
    });
    setIsModalOpen(true);
    setIsCreating(true);
  };

  const openEditModal = (character) => {
    setSelectedCharacter(character);
    setNewCharacter({ ...character });
    setIsModalOpen(true);
    setIsCreating(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewCharacter({
      ...newCharacter,
      [name]: value,
    });
  };

  const handleNotesChange = (e) => {
    setNewCharacter({
      ...newCharacter,
      notes: e.target.value,
    });
  };

  const handleTotalHpChange = (e) => {
    const newTotalHp = parseInt(e.target.value) || 0;
    setNewCharacter((prevChar) => ({
      ...prevChar,
      totalHp: newTotalHp,
      currentHp: Math.min(prevChar.currentHp, newTotalHp),
    }));
  };

  const handleStatChange = (index, field, value) => {
    const updatedStats = [...newCharacter.stats];

    if (field === "count") {
      const newCount = parseInt(value) || 0;
      const currentValue = updatedStats[index].value || [];

      let newValue = [];
      if (Array.isArray(currentValue)) {
        newValue = [...currentValue.slice(0, newCount)];
        while (newValue.length < newCount) newValue.push(false);
        if (newValue.length > newCount) newValue.length = newCount;
      } else {
        newValue = Array(newCount).fill(false);
      }

      updatedStats[index] = {
        ...updatedStats[index],
        count: newCount,
        value: newValue,
      };
    } else {
      updatedStats[index] = {
        ...updatedStats[index],
        [field]:
          (field === "value" && updatedStats[index].type === "number") ||
          updatedStats[index].type === "counter"
            ? parseInt(value) || 0
            : value,
      };
    }

    setNewCharacter({
      ...newCharacter,
      stats: updatedStats,
    });
  };

  const addStatField = (type) => {
    const newStat = {
      id: uuidv4(),
      name: "New Stat",
      type,
      value: type === "number" || type === "counter" ? 0 : "",
    };

    if (type === "checkboxes") {
      newStat.count = 3;
      newStat.value = Array(3).fill(false);
    }

    setNewCharacter({
      ...newCharacter,
      stats: [...newCharacter.stats, newStat],
    });
  };

  const removeStatField = (index) => {
    const updatedStats = [...newCharacter.stats];
    updatedStats.splice(index, 1);
    setNewCharacter({
      ...newCharacter,
      stats: updatedStats,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCharacter({
          ...newCharacter,
          image: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCharacter = () => {
    if (isCreating) {
      setNewCharacter((prevChar) => ({
        ...prevChar,
        currentHp: prevChar.totalHp,
      }));
      setCharacters([...characters, { ...newCharacter, id: uuidv4() }]);
    } else {
      const updatedCharacters = characters.map((character) =>
        character.id === selectedCharacter.id ? newCharacter : character
      );
      setCharacters(updatedCharacters);
      setSelectedCharacter(newCharacter);
    }
    setIsModalOpen(false);
    setIsCreating(false);
  };

  const duplicateCharacter = (character) => {
    const newChar = {
      ...character,
      id: uuidv4(),
      name: `${character.name} (Copy)`,
      position: {
        x: character.position.x + 1,
        y: character.position.y,
      },
      currentHp: character.currentHp,
      totalHp: character.totalHp,
    };
    setCharacters([...characters, newChar]);
  };

  const deleteCharacter = (characterId) => {
    if (predefinedCharacters.some((c) => c.id === characterId)) {
      alert("Predefined characters cannot be deleted.");
      return;
    }

    setCharacters(
      characters.filter((character) => character.id !== characterId)
    );
    if (selectedCharacter && selectedCharacter.id === characterId) {
      setSelectedCharacter(null);
    }
  };

  const applyHpChange = (type) => {
    const amount = parseInt(hpChangeAmount) || 0;
    if (selectedCharacter && amount > 0) {
      setCharacters((prevCharacters) =>
        prevCharacters.map((char) => {
          if (char.id === selectedCharacter.id) {
            let newCurrentHp = char.currentHp;
            if (type === "damage") {
              newCurrentHp = Math.max(0, char.currentHp - amount);
            } else if (type === "heal") {
              newCurrentHp = Math.min(char.totalHp, char.currentHp + amount);
            }
            return { ...char, currentHp: newCurrentHp };
          }
          return char;
        })
      );
      setSelectedCharacter((prevSelected) => {
        if (prevSelected) {
          let newCurrentHp = prevSelected.currentHp;
          if (type === "damage") {
            newCurrentHp = Math.max(0, prevSelected.currentHp - amount);
          } else if (type === "heal") {
            newCurrentHp = Math.min(
              prevSelected.totalHp,
              prevSelected.currentHp + amount
            );
          }
          return { ...prevSelected, currentHp: newCurrentHp };
        }
        return prevSelected;
      });
      setHpChangeAmount("");
    }
  };

  // --- Rendering Functions ---
  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        cells.push(
          <div
            key={`${x}-${y}`}
            className="grid-cell"
            style={{
              width: `${squareSizePx}px`,
              height: `${squareSizePx}px`,
            }}
          />
        );
      }
    }
    return cells;
  };

  const renderCharacters = () => {
    return characters.map((character) => {
      const isPredefined = predefinedCharacters.some(
        (c) => c.id === character.id
      );

      return (
        <div
          key={character.id}
          className={`character ${
            selectedCharacter?.id === character.id ? "selected" : ""
          } ${isPredefined ? "predefined" : ""}`}
          style={{
            left: `${character.position.x * squareSizePx}px`,
            top: `${character.position.y * squareSizePx}px`,
            width: `${squareSizePx}px`,
            height: `${squareSizePx}px`,
            backgroundColor: character.image ? "transparent" : character.color,
          }}
          onClick={() => setSelectedCharacter(character)}
          onDoubleClick={() => openEditModal(character)}
          onMouseDown={(e) => startDragging(e, character)}
          draggable={!isPredefined}
        >
          {character.image ? (
            <img
              src={character.image}
              alt={character.name}
              className="character-image"
              style={{
                width: `${squareSizePx}px`,
                height: `${squareSizePx}px`,
              }}
            />
          ) : (
            <div className="character-initial">{character.name.charAt(0)}</div>
          )}
        </div>
      );
    });
  };

  const renderGhostCharacter = () => {
    if (!isDragging || !selectedCharacter || !dragStartPosition) return null;

    const isPredefined = predefinedCharacters.some(
      (c) => c.id === selectedCharacter.id
    );

    return (
      <div
        className={`character ghost-character ${
          isPredefined ? "predefined" : ""
        }`}
        style={{
          left: `${dragStartPosition.x * squareSizePx}px`,
          top: `${dragStartPosition.y * squareSizePx}px`,
          width: `${squareSizePx}px`,
          height: `${squareSizePx}px`,
          backgroundColor: selectedCharacter.image
            ? "transparent"
            : selectedCharacter.color,
          opacity: 0.3,
          pointerEvents: "none",
        }}
      >
        {selectedCharacter.image ? (
          <img
            src={selectedCharacter.image}
            alt={selectedCharacter.name}
            className="character-image"
            style={{
              width: `${squareSizePx}px`,
              height: `${squareSizePx}px`,
              opacity: 0.5,
            }}
          />
        ) : (
          <div className="character-initial">
            {selectedCharacter.name.charAt(0)}
          </div>
        )}
      </div>
    );
  };

  // Render AoE effect
  const renderAoE = () => {
    const affectedSquares = getAffectedSquares();
    return affectedSquares.map((point, index) => (
      <div
        key={`aoe-${index}`}
        className="aoe-square"
        style={{
          position: "absolute",
          left: `${point.x * squareSizePx}px`,
          top: `${point.y * squareSizePx}px`,
          width: `${squareSizePx}px`,
          height: `${squareSizePx}px`,
          backgroundColor: "rgba(255, 0, 0, 0.3)",
          border: "1px solid rgba(255, 0, 0, 0.7)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    ));
  };

  return (
    <div className="dnd-battle-map">
      {/* Map Controls Section */}
      <div className="map-controls">
        <button onClick={openCreateModal} className="control-button">
          Create Character
        </button>
        <button
          onClick={() => setGridHeight(gridHeight + 5)}
          className="control-button"
        >
          Increase Height
        </button>
        <button
          onClick={() => setGridHeight(Math.max(10, gridHeight - 5))}
          className="control-button"
        >
          Decrease Height
        </button>

        <div className="grid-size">
          <div className="aoe-controls">
            <label>Area of Effect:</label>
            <select
              value={aoeShape || ""}
              onChange={(e) => setAoeShape(e.target.value || null)}
            >
              <option value="">None</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="cone">Cone</option>
              <option value="line">Line</option>
            </select>

            {aoeShape && (
              <input
                type="number"
                min="1"
                max="10"
                value={aoeSize}
                onChange={(e) => setAoeSize(parseInt(e.target.value) || 1)}
                placeholder="Size"
              />
            )}

            {(aoeOrigin || aoeTarget) && (
              <button
                onClick={() => {
                  setAoeOrigin(null);
                  setAoeTarget(null);
                }}
              >
                Clear AoE
              </button>
            )}
          </div>
          Grid: {gridWidth}ft × {gridHeight}ft | 1 square ={" "}
          <input
            type="number"
            value={squareSize}
            onChange={(e) => setSquareSize(parseFloat(e.target.value) || 1.5)}
            step="0.1"
            min="0.5"
            max="3"
            className="square-size-input"
          />
          m
          {isDragging && dragStartPosition && hoverPosition && (
            <span className="distance-indicator">
              | Distance: {calculateDistance(dragStartPosition, hoverPosition)}m
            </span>
          )}
        </div>
      </div>

      {/* Main Grid Container */}
      <div
        ref={gridRef}
        className="grid-container"
        style={{
          gridTemplateColumns: `repeat(${gridWidth}, ${squareSizePx}px)`,
          height: `${gridHeight * squareSizePx}px`,
        }}
        onClick={handleGridClick}
        onMouseMove={handleDragging}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        {renderGrid()}
        {renderGhostCharacter()}
        {renderCharacters()}
        {renderAoE()}
      </div>

      {/* Character Details Panel */}
      {selectedCharacter && (
        <div className="character-details">
          <h3>{selectedCharacter.name}</h3>

          <div className="character-hp">
            <h4>
              HP: {selectedCharacter.currentHp} / {selectedCharacter.totalHp}
            </h4>
            <div className="hp-control">
              <input
                type="number"
                value={hpChangeAmount}
                onChange={(e) => setHpChangeAmount(e.target.value)}
                placeholder="Amount"
                className="hp-input-amount"
                min="0"
              />
              <button
                onClick={() => applyHpChange("damage")}
                className="hp-action-button damage"
              >
                Damage
              </button>
              <button
                onClick={() => applyHpChange("heal")}
                className="hp-action-button heal"
              >
                Heal
              </button>
            </div>
          </div>

          <div className="character-notes">
            <h4>Notes</h4>
            <textarea
              value={selectedCharacter.notes || ""}
              onChange={(e) => {
                const updatedNotes = e.target.value;
                const updatedCharacters = characters.map((char) =>
                  char.id === selectedCharacter.id
                    ? { ...char, notes: updatedNotes }
                    : char
                );
                setCharacters(updatedCharacters);
                setSelectedCharacter((prevSelected) => ({
                  ...prevSelected,
                  notes: updatedNotes,
                }));
              }}
              placeholder="Add notes about this character..."
            />
          </div>

          <div className="character-stats">
            <h4>Custom Stats</h4>
            {selectedCharacter.stats &&
              selectedCharacter.stats.map((stat, index) => (
                <div key={stat.id} className="stat-item">
                  <div className="stat-name">{stat.name}:</div>

                  {stat.type === "number" && (
                    <div className="stat-value">
                      <input
                        type="number"
                        value={stat.value}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          const updatedCharacters = characters.map((char) =>
                            char.id === selectedCharacter.id
                              ? {
                                  ...char,
                                  stats: char.stats.map((s, i) =>
                                    i === index
                                      ? {
                                          ...s,
                                          value: newValue,
                                        }
                                      : s
                                  ),
                                }
                              : char
                          );
                          setCharacters(updatedCharacters);
                          setSelectedCharacter((prevSelected) => ({
                            ...prevSelected,
                            stats: prevSelected.stats.map((s, i) =>
                              i === index ? { ...s, value: newValue } : s
                            ),
                          }));
                        }}
                      />
                    </div>
                  )}

                  {stat.type === "checkboxes" && (
                    <div className="checkbox-container">
                      {Array(stat.count || 0)
                        .fill()
                        .map((_, idx) => (
                          <label key={idx} className="checkbox-option">
                            <input
                              type="checkbox"
                              checked={stat.value[idx] || false}
                              onChange={() => {
                                const newValue = [...stat.value];
                                newValue[idx] = !newValue[idx];
                                const updatedCharacters = characters.map(
                                  (char) =>
                                    char.id === selectedCharacter.id
                                      ? {
                                          ...char,
                                          stats: char.stats.map((s, i) =>
                                            i === index
                                              ? { ...s, value: newValue }
                                              : s
                                          ),
                                        }
                                      : char
                                );
                                setCharacters(updatedCharacters);
                                setSelectedCharacter((prevSelected) => ({
                                  ...prevSelected,
                                  stats: prevSelected.stats.map((s, i) =>
                                    i === index ? { ...s, value: newValue } : s
                                  ),
                                }));
                              }}
                            />
                          </label>
                        ))}
                    </div>
                  )}

                  {stat.type === "counter" && (
                    <div className="counter-container">
                      <button
                        onClick={() => {
                          const newValue = Math.max(0, stat.value - 1);
                          const updatedCharacters = characters.map((char) =>
                            char.id === selectedCharacter.id
                              ? {
                                  ...char,
                                  stats: char.stats.map((s, i) =>
                                    i === index
                                      ? {
                                          ...s,
                                          value: newValue,
                                        }
                                      : s
                                  ),
                                }
                              : char
                          );
                          setCharacters(updatedCharacters);
                          setSelectedCharacter((prevSelected) => ({
                            ...prevSelected,
                            stats: prevSelected.stats.map((s, i) =>
                              i === index ? { ...s, value: newValue } : s
                            ),
                          }));
                        }}
                      >
                        -
                      </button>
                      <span>{stat.value}</span>
                      <button
                        onClick={() => {
                          const newValue = stat.value + 1;
                          const updatedCharacters = characters.map((char) =>
                            char.id === selectedCharacter.id
                              ? {
                                  ...char,
                                  stats: char.stats.map((s, i) =>
                                    i === index ? { ...s, value: newValue } : s
                                  ),
                                }
                              : char
                          );
                          setCharacters(updatedCharacters);
                          setSelectedCharacter((prevSelected) => ({
                            ...prevSelected,
                            stats: prevSelected.stats.map((s, i) =>
                              i === index ? { ...s, value: newValue } : s
                            ),
                          }));
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="character-actions">
            <button
              onClick={() => openEditModal(selectedCharacter)}
              className="action-button"
            >
              Edit
            </button>
            <button
              onClick={() => duplicateCharacter(selectedCharacter)}
              className="action-button"
            >
              Duplicate
            </button>
            <button
              onClick={() => deleteCharacter(selectedCharacter.id)}
              className="action-button delete"
              disabled={predefinedCharacters.some(
                (c) => c.id === selectedCharacter.id
              )}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Character Creation/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isCreating ? "Create New Character" : "Edit Character"}</h2>

            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={newCharacter.name}
                onChange={handleFormChange}
                placeholder="Character name"
              />
            </div>

            <div className="form-group">
              <label>Total HP:</label>
              <input
                type="number"
                name="totalHp"
                value={newCharacter.totalHp}
                onChange={handleTotalHpChange}
                placeholder="Total HP"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {newCharacter.image && (
                <img
                  src={newCharacter.image}
                  alt="Preview"
                  className="image-preview"
                />
              )}
            </div>

            <div className="form-group">
              <label>Token Color:</label>
              <input
                type="color"
                name="color"
                value={newCharacter.color}
                onChange={handleFormChange}
              />
            </div>

            <div className="form-group">
              <label>Notes:</label>
              <textarea
                value={newCharacter.notes}
                onChange={handleNotesChange}
                placeholder="Add notes about this character..."
              />
            </div>

            <div className="stats-section">
              <h3>Custom Stats</h3>
              <div className="stat-buttons">
                <button
                  onClick={() => addStatField("number")}
                  className="stat-type-button"
                >
                  Add Number
                </button>
                <button
                  onClick={() => addStatField("checkboxes")}
                  className="stat-type-button"
                >
                  Add Checkboxes
                </button>
                <button
                  onClick={() => addStatField("counter")}
                  className="stat-type-button"
                >
                  Add Counter
                </button>
              </div>

              {newCharacter.stats.map((stat, index) => (
                <div key={stat.id} className="stat-form">
                  <div className="stat-input-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={stat.name}
                      onChange={(e) =>
                        handleStatChange(index, "name", e.target.value)
                      }
                      placeholder="Stat name"
                    />
                  </div>

                  <div className="stat-input-group">
                    <label>Type:</label>
                    <div className="stat-type">{stat.type}</div>
                  </div>

                  {stat.type === "checkboxes" && (
                    <div className="stat-input-group">
                      <label>Number of Checkboxes:</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={stat.count || 0}
                        onChange={(e) =>
                          handleStatChange(index, "count", e.target.value)
                        }
                      />
                    </div>
                  )}

                  {stat.type === "counter" && (
                    <div className="stat-input-group">
                      <label>Initial Value:</label>
                      <input
                        type="number"
                        value={stat.value}
                        onChange={(e) =>
                          handleStatChange(index, "value", e.target.value)
                        }
                      />
                    </div>
                  )}

                  <button
                    onClick={() => removeStatField(index)}
                    className="remove-stat-button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsCreating(false);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
              <button onClick={saveCharacter} className="save-button">
                {isCreating ? "Create Character" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DndBattleMap;
