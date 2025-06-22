import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Import the cross-swords image directly
import crossSwordsImage from "./assets/cross-swords.png"; // Adjust path if needed

const InitiativeTracker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [initiativeValues, setInitiativeValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all required data from localStorage
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load character data
        const predefinedData = JSON.parse(
          localStorage.getItem("dndPredefinedOverrides") || "{}"
        );
        const customChars = JSON.parse(
          localStorage.getItem("dndCustomCharacters") || "[]"
        );

        // Process characters
        const predefinedChars = Object.entries(predefinedData).map(
          ([id, data]) => ({
            id,
            name: id.charAt(0).toUpperCase() + id.slice(1),
            ...data,
          })
        );
        const allChars = [...predefinedChars, ...customChars];

        // Load saved initiatives
        const savedInitiatives = JSON.parse(
          localStorage.getItem("dndInitiativeValues") || "{}"
        );

        // Initialize initiative values with proper fallbacks
        const initialInitiatives = {};
        allChars.forEach((char) => {
          initialInitiatives[char.id] =
            savedInitiatives[char.id] !== undefined
              ? savedInitiatives[char.id]
              : char.initiative || 0;
        });

        // Update state
        setCharacters(allChars);
        setInitiativeValues(initialInitiatives);
      } catch (error) {
        console.error("Failed to load initiative data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();

    const handleStorageChange = () => loadAllData();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Persist initiative values to localStorage
  useEffect(() => {
    if (!isLoading && Object.keys(initiativeValues).length > 0) {
      localStorage.setItem(
        "dndInitiativeValues",
        JSON.stringify(initiativeValues)
      );
    }
  }, [initiativeValues, isLoading]);

  const handleInitiativeChange = (id, value) => {
    const numValue = parseInt(value) || 0;
    setInitiativeValues((prev) => ({
      ...prev,
      [id]: numValue,
    }));
  };

  const orderByInitiative = () => {
    const sorted = [...characters].sort((a, b) => {
      const initiativeDiff = initiativeValues[b.id] - initiativeValues[a.id];
      return initiativeDiff !== 0
        ? initiativeDiff
        : a.name.localeCompare(b.name);
    });
    setCharacters(sorted);
    setCurrentTurn(0);
  };

  const nextTurn = () => {
    setCurrentTurn((prev) => (prev + 1) % characters.length);
  };

  const resetTurns = () => {
    const resetValues = {};
    characters.forEach((char) => {
      resetValues[char.id] = 0;
    });
    setInitiativeValues(resetValues);
    setCurrentTurn(0);
  };

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCharacters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Update current turn position
        if (currentTurn === oldIndex) {
          setCurrentTurn(newIndex);
        } else if (currentTurn > oldIndex && currentTurn <= newIndex) {
          setCurrentTurn(currentTurn - 1);
        } else if (currentTurn < oldIndex && currentTurn >= newIndex) {
          setCurrentTurn(currentTurn + 1);
        }

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const SortableItem = ({ char, index }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: char.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    // Dynamically import character image
    // This uses a function to require the image, which Webpack handles.
    // Ensure that the path is correct relative to the *current file*.
    const getCharacterImage = (charId) => {
      try {
        // This line tells Webpack to look for the image in the specified folder
        // and include it in the bundle.
        // Adjust the path './assets/characters/' if InitiativeTracker.jsx is in a subfolder.
        return require(`./assets/characters/${charId.toLowerCase()}.jpg`);
      } catch (err) {
        console.warn(`Image for character ${charId} not found.`);
        return null; // Return null or a placeholder image
      }
    };

    const characterImageUrl = getCharacterImage(char.id);

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`initiative-item ${
          index === currentTurn ? "current-turn" : ""
        }`}
      >
        <div className="item-content">
          <div className="drag-handle" {...attributes} {...listeners}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z" />
            </svg>
          </div>

          <div className="character-image">
            {characterImageUrl ? (
              <img src={characterImageUrl} alt={char.name} />
            ) : (
              <div className="placeholder-image">?</div> // Or a default image
            )}
          </div>

          <div className="character-info">
            <div className="character-name">
              {index === currentTurn && (
                <span className="current-turn-indicator">→</span>
              )}
              {char.name}
            </div>
          </div>

          <div className="initiative-input">
            <input
              type="number"
              value={initiativeValues[char.id] ?? ""}
              onChange={(e) => handleInitiativeChange(char.id, e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading-message">Loading initiative tracker...</div>;
  }

  return (
    <>
      <button className="initiative-fab" onClick={() => setIsOpen(!isOpen)}>
        {/* Use the imported crossSwordsImage */}
        <img src={crossSwordsImage} alt="Initiative Tracker" />
      </button>

      {isOpen && (
        <div className="initiative-modal">
          <div className="initiative-header">
            <div className="initiative-actions">
              <button onClick={orderByInitiative}>Order by Initiative</button>
              <button onClick={resetTurns}>Reset Turns</button>
              <button onClick={nextTurn}>
                Next Turn{" "}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={characters.map((char) => char.id)}>
              <div className="initiative-list">
                {characters.map((char, index) => (
                  <SortableItem key={char.id} char={char} index={index} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </>
  );
};

export default InitiativeTracker;
