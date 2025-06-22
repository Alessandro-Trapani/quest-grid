// DiceRoller.jsx
import React, { useEffect, useState } from "react";
import "./styles.css";

// Import all dice images directly
import d4Image from "./assets/dices/d4.png";
import d6Image from "./assets/dices/d6.png";
import d8Image from "./assets/dices/d8.png";
import d10Image from "./assets/dices/d10.png";
import d12Image from "./assets/dices/d12.png";
import d20Image from "./assets/dices/d20.png";

// Create a mapping for easy access
const diceImageMap = {
  4: d4Image,
  6: d6Image,
  8: d8Image,
  10: d10Image,
  12: d12Image,
  20: d20Image,
};

const diceTypes = [4, 6, 8, 10, 12, 20];

const DiceRoller = () => {
  const [selectedDice, setSelectedDice] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [visible, setVisible] = useState(false);
  const [finalValues, setFinalValues] = useState([]);
  const [total, setTotal] = useState(null);

  const addDice = (sides) => {
    setSelectedDice((prev) => [...prev, { sides }]);
  };

  const removeDice = (index) => {
    if (rolling) return;
    setSelectedDice((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setFinalValues((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const clearDice = () => {
    if (rolling) return;
    setSelectedDice([]);
    setFinalValues([]);
    setTotal(null);
  };

  const handleRoll = () => {
    if (selectedDice.length === 0) return;
    setRolling(true);

    const newValues = selectedDice.map(
      (d) => Math.floor(Math.random() * d.sides) + 1
    );
    setTimeout(() => {
      setRolling(false);
      setFinalValues(newValues);
      setTotal(newValues.reduce((a, b) => a + b, 0));
    }, 1000);
  };

  const closeOverlay = () => {
    if (!rolling) setVisible(false);
  };

  return (
    <>
      <button
        className="d20-fab"
        onClick={() => setVisible(true)}
        title="Open Dice Roller"
      >
        {/* Use the imported d20Image */}
        <img src={d20Image} alt="Open Dice Roller" className="dice-image " />
        <div className="number-overlay">{20}</div>
      </button>
      {visible && (
        <div className="overlay" onClick={closeOverlay}>
          <div
            className="dice-modal modal-top"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dice-selector">
              {diceTypes.map((sides) => (
                <div
                  key={sides}
                  className="dice-wrapper clickable"
                  onClick={() => addDice(sides)}
                >
                  {/* Use the diceImageMap to get the correct image */}
                  <img
                    src={diceImageMap[sides]}
                    alt={`d${sides}`}
                    className="dice-image"
                  />
                  <div className="number-overlay">{sides}</div>
                </div>
              ))}
            </div>

            <div className="selected-dice grow-bottom">
              {selectedDice.map((dice, index) => (
                <div
                  key={index}
                  className="dice-wrapper clickable"
                  onClick={() => removeDice(index)}
                >
                  <RollingDie
                    sides={dice.sides}
                    rolling={rolling}
                    finalValue={finalValues[index]}
                    diceImageMap={diceImageMap} // Pass the map down
                  />
                </div>
              ))}
            </div>
            <div className="actions">
              <button onClick={handleRoll} disabled={rolling}>
                Roll
              </button>
              <button onClick={clearDice} disabled={rolling}>
                Clear All
              </button>
            </div>
            <h3 className="total-display">
              Total: {total == null ? 0 : total}
            </h3>
          </div>
        </div>
      )}
    </>
  );
};

// RollingDie component also needs the image map
const RollingDie = ({ sides, rolling, finalValue, diceImageMap }) => {
  const [value, setValue] = useState("?");

  useEffect(() => {
    if (!rolling) return;

    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * sides) + 1);
    }, 75);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [rolling, sides]);

  useEffect(() => {
    if (!rolling && finalValue) setValue(finalValue);
  }, [rolling, finalValue]);

  return (
    <div className="dice-wrapper">
      {/* Use the diceImageMap here too */}
      <img
        src={diceImageMap[sides]}
        alt={`d${sides}`}
        className={`dice-image ${rolling ? "spin" : ""}`}
      />
      <div className="number-overlay">{value}</div>
    </div>
  );
};

export default DiceRoller;
