// DiceRoller.jsx
import React, { useEffect, useState } from "react";
import "./styles.css";

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
        <img
          src="/dices/d20.png"
          alt="Open Dice Roller"
          className="dice-image "
        />
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
                  <img
                    src={`/dices/d${sides}.png`}
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

const RollingDie = ({ sides, rolling, finalValue }) => {
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
      <img
        src={`/dices/d${sides}.png`}
        alt={`d${sides}`}
        className={`dice-image ${rolling ? "spin" : ""}`}
      />
      <div className="number-overlay">{value}</div>
    </div>
  );
};

export default DiceRoller;
