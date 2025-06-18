"use client";

import { useState, useEffect, useRef } from "react";

interface WheelSection {
  type: string;
  number: number;
  color: string;
}

const sections: WheelSection[] = [
  { type: "A", number: 1, color: "red" },
  { type: "A", number: 1, color: "red" },
  { type: "A", number: 1, color: "red" },
  { type: "A", number: 1, color: "red" },
  { type: "B", number: 2, color: "black" },
  { type: "B", number: 2, color: "black" },
  { type: "B", number: 2, color: "black" },
  { type: "B", number: 2, color: "black" },
  { type: "C", number: 3, color: "green" },
  { type: "C", number: 3, color: "green" },
];

interface Bet {
  type: string;
  amount: number;
  result: string;
}

const betTypeToNumber = {
  A: 1,
  B: 2,
  C: 3,
};

const SPIN_INTERVAL = 15000; // 15 seconds in milliseconds
const RESULT_DISPLAY_DURATION = 3000; // 3 seconds in milliseconds

const RouletteGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [betType, setBetType] = useState("A");
  const [spinning, setSpinning] = useState(false);
  const [betHistory, setBetHistory] = useState<Bet[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(Math.floor(SPIN_INTERVAL / 1000));
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const angleRef = useRef(0);
  const winningIndexRef = useRef<number>(0);
  const lastSpinTimeRef = useRef(Date.now());
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    drawWheel(ctx, angleRef.current);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastSpinTimeRef.current;
      const remaining = Math.max(0, Math.floor((SPIN_INTERVAL - elapsed) / 1000));
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-spin every 15 seconds if a bet is placed
  useEffect(() => {
    spinIntervalRef.current = setInterval(() => {
      if (!spinning && hasPlacedBet) {
        lastSpinTimeRef.current = Date.now();
        setTimeRemaining(Math.floor(SPIN_INTERVAL / 1000));
        spin();
      }
    }, SPIN_INTERVAL);

    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, [spinning, hasPlacedBet]);

  const drawWheel = (ctx: CanvasRenderingContext2D, angle: number) => {
    const centerX = canvasRef.current!.width / 2;
    const centerY = canvasRef.current!.height / 2;
    const radius = canvasRef.current!.width / 2 - 10;
    const sliceAngle = (2 * Math.PI) / sections.length;

    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

    sections.forEach((section, index) => {
      const startAngle = angle + index * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = section.color;
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.fillStyle = section.color === "black" ? "white" : "black";
      ctx.font = "16px Arial";
      ctx.fillText(`${section.type} (${section.number})`, radius - 50, 10);
      ctx.restore();
    });

    // Always draw arrow
    ctx.save();
    ctx.fillStyle = "gold";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY - radius - 15); // Top left of triangle
    ctx.lineTo(centerX + 10, centerY - radius - 15); // Top right
    ctx.lineTo(centerX, centerY - radius + 5); // Bottom center (pointing down)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const placeBet = () => {
    const bet = parseInt(betAmount.toString());

    if (bet > balance || bet <= 0 || isNaN(bet)) {
      setBetHistory(prev => [...prev, { type: betType, amount: bet, result: "Invalid bet" }]);
      return;
    }

    setBetHistory(prev => {
      const existingBet = prev.find(b => b.type === betType && b.result === "Pending");
      if (existingBet) {
        return prev.map(b =>
          b.type === betType && b.result === "Pending"
            ? { ...b, amount: b.amount + bet }
            : b
        );
      }
      return [...prev.filter(b => b.result !== "Invalid bet"), { type: betType, amount: bet, result: "Pending" }];
    });
    setHasPlacedBet(true);
    setBalance(prev => prev - bet);
  };

  const spin = () => {
    if (spinning || !hasPlacedBet) return;
    setSpinning(true);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const spinDuration = 3000;
    const startTime = performance.now();
    const randomOffset = Math.random() * 2 * Math.PI;
    const totalRotations = 5 + Math.random();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      angleRef.current = easedProgress * (totalRotations * 2 * Math.PI + randomOffset);
      drawWheel(ctx, angleRef.current);

      if (elapsed < spinDuration) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const normalizedAngle = angleRef.current % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / sections.length;
        const winningIndex = Math.floor(
          ((2 * Math.PI - normalizedAngle + sliceAngle / 2) / (2 * Math.PI)) * sections.length
        ) % sections.length;
        winningIndexRef.current = winningIndex;
        drawWheel(ctx, angleRef.current);
        const winningSection = sections[winningIndex];
        checkWin(winningSection);
      }
    };

    requestAnimationFrame(animate);
  };

  const checkWin = (winningSection: WheelSection) => {
    let totalPayout = 0;

    const updatedBetHistory = betHistory.reduce((acc, bet) => {
      if (bet.result === "Invalid bet") return [...acc, bet];
      const betNumber = betTypeToNumber[bet.type as keyof typeof betTypeToNumber];
      let resultDisplay = `-${bet.amount}`;

      if (winningSection.number === betNumber) {
        let payout = 0;
        if (bet.type === "A" || bet.type === "B") {
          payout = bet.amount * 2;
        } else if (bet.type === "C") {
          payout = bet.amount * 14;
        }
        totalPayout += payout;
        resultDisplay = `+${payout}`;
      }

      return [...acc, { ...bet, result: resultDisplay }];
    }, [] as Bet[]);

    setBetHistory(updatedBetHistory);
    setBalance(prev => prev + totalPayout);

    setTimeout(() => {
      setBetHistory([]);
      setHasPlacedBet(false);
      lastSpinTimeRef.current = Date.now();
      setTimeRemaining(Math.floor(SPIN_INTERVAL / 1000));
    }, RESULT_DISPLAY_DURATION);
  };

  // Group bets by type for separate tables
  const betGroups = ["A", "B", "C"].reduce((acc, type) => {
    const bets = betHistory.filter(bet => bet.type === type);
    if (bets.length > 0) {
      acc[type] = bets.reduce((sum, bet) => ({
        ...bet,
        amount: sum.amount + (bet.result === "Pending" ? bet.amount : 0),
        result: bet.result === "Pending" ? "Pending" : bet.result
      }), { type, amount: 0, result: "Pending" });
    }
    return acc;
  }, {} as Record<string, Bet>);

  return (
    <div className="text-center max-w-md mx-auto bg-white p-6 rounded-lg shadow-md" style={{ margin: '0 auto' }}>
      <h1 className="text-3xl font-bold mb-4">Roulette Game</h1>
      <canvas
        ref={canvasRef}
        id="rouletteWheel"
        width="300"
        height="300"
        className="border-2 border-black rounded-full mx-auto"
      ></canvas>
      <div className="mt-6 space-y-4">
        <p className="text-lg">Balance: <span>{balance}</span> chips</p>
        <div>
          <label htmlFor="betAmount" className="mr-2">Bet Amount:</label>
          <input
            type="number"
            id="betAmount"
            min="10"
            max="100"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value))}
            className="border p-1 rounded w-24"
          />
        </div>
        <div>
          <label htmlFor="betType" className="mr-2">Bet Type:</label>
          <select
            id="betType"
            value={betType}
            onChange={(e) => setBetType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="A">A (1, 2x)</option>
            <option value="B">B (2, 2x)</option>
            <option value="C">C (3, 14x)</option>
          </select>
        </div>
        <button
          onClick={placeBet}
          disabled={spinning}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Place Bet
        </button>
        <p className="text-lg">Next spin in: {timeRemaining} seconds</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">Bets</h2>
        {Object.entries(betGroups).map(([type, bet]) => (
          <div key={type} className="mb-4">
            <h3 className="text-lg font-medium mb-2">Bet Type {type}</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-4 py-2 bg-gray-200">Bet Type</th>
                  <th className="border px-4 py-2 bg-gray-200">Bet Amount</th>
                  <th className="border px-4 py-2 bg-gray-200">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-1">{bet.type}</td>
                  <td className="border px-4 py-1">{bet.amount}</td>
                  <td className="border px-4 py-1">{bet.result}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouletteGame;