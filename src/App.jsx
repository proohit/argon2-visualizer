import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeGrid } from "react-window";
import "./App.css";
import ResizeObserver from "resize-observer-polyfill";

const MIN_MEMORY = 1024;
const MIN_ITERATIONS = 1;
const MIN_PARALLELISM = 1;
const DEFAULT_VARIANT = "i";
const FIRST_COLUMN = 1;
const SECOND_COLUMN = 2;
const HEADER_COLUMN = 0;
const HEADER_ROW = 0;

const FORMULA_T_EQUALS_1 = {
  "[i][0]": (i) => `G(H0, ${i})`,
  "[i][1]": (i) => `G(H1, ${i})`,
  "[i][j]": (i, j) => `G(B[${i}][${j - 1}], B[i'][j'])`,
};

const FORMULA_T_LARGER_1 = {
  "[i][0]": (i, q) => `G(B[${i}][${q - 1}], B[i'][j'])`,
  "[i][j]": (i, j) => `G(B[${i}][${j - 1}], B[i'][j'])`,
};

function App() {
  const [memory, setMemory] = useState(MIN_MEMORY);
  const [iterations, setIterations] = useState(MIN_ITERATIONS);
  const [parallelism, setParallelism] = useState(MIN_PARALLELISM);
  const [variant, setVariant] = useState(DEFAULT_VARIANT);
  const [started, setStarted] = useState(false);
  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(
        (entries) => {
          const [entry] = entries;
          const { width } = entry.contentRect;
          setContainerDimensions({ width });
        },
        {
          threshold: 0,
        }
      );
      observer.observe(containerRef.current);
    }
  }, [containerRef.current]);

  const [currentIteration, setCurrentIteration] = useState(1);

  const q = useMemo(
    () => Math.floor(memory / parallelism),
    [memory, parallelism]
  );

  const rowCount = useMemo(() => parallelism + 1, [parallelism]);

  const columnCount = useMemo(() => q + 1, [q]);

  const startAlgorithm = (e) => {
    e.preventDefault();
    setStarted(true);
    setCurrentIteration(1);
  };

  const drawCell = (columnIndex, rowIndex) => {
    if (columnIndex === HEADER_COLUMN && rowIndex === HEADER_ROW) {
      return "Row / Column";
    }
    if (columnIndex === HEADER_COLUMN) {
      return rowIndex - 1;
    }
    if (rowIndex === HEADER_ROW) {
      return columnIndex - 1;
    }
    let cell = `B[${rowIndex - 1}][${columnIndex - 1}]=`;
    if (currentIteration === 1) {
      if (columnIndex === FIRST_COLUMN) {
        cell += FORMULA_T_EQUALS_1["[i][0]"](rowIndex - 1);
      } else if (columnIndex === SECOND_COLUMN) {
        cell += FORMULA_T_EQUALS_1["[i][1]"](rowIndex - 1);
      } else {
        cell += FORMULA_T_EQUALS_1["[i][j]"](rowIndex - 1, columnIndex - 1);
      }
    } else {
      if (columnIndex === 1) {
        cell += FORMULA_T_LARGER_1["[i][0]"](rowIndex - 1, q);
      } else {
        cell += FORMULA_T_LARGER_1["[i][j]"](rowIndex - 1, columnIndex - 1);
      }
    }
    return cell;
  };

  return (
    <Container ref={containerRef} className="mt-4">
      <h1 className="text-center">Argon2 Visualizer</h1>
      <Form onSubmit={startAlgorithm}>
        <Form.Group className="mb-3">
          <Form.Label>Argon2 Variant</Form.Label>
          <Form.Select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          >
            <option value="i">Argon2i</option>
            <option value="d">Argon2d</option>
            <option value="id">Argon2id</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Memory (KB)</Form.Label>
          <Form.Control
            type="number"
            min={MIN_MEMORY}
            placeholder="Memory"
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Iterations</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Iterations"
            value={iterations}
            onChange={(e) => setIterations(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Parallelism</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Parallelism"
            value={parallelism}
            onChange={(e) => setParallelism(Number(e.target.value))}
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>

      {started && (
        <div>
          <p>Current Iteration: {currentIteration}</p>
          <Button
            disabled={currentIteration === 1}
            onClick={() => setCurrentIteration(currentIteration - 1)}
          >
            Previous
          </Button>
          <Button
            disabled={currentIteration === iterations}
            onClick={() => setCurrentIteration(currentIteration + 1)}
          >
            Next
          </Button>
          <h4 className="my-4">Memory Table</h4>
          <FixedSizeGrid
            columnCount={columnCount}
            rowCount={rowCount}
            height={300}
            width={containerDimensions?.width}
            columnWidth={300}
            rowHeight={35}
          >
            {({ columnIndex, rowIndex, style }) => (
              <div
                className="border"
                style={{
                  ...style,
                  backgroundColor:
                    columnIndex === HEADER_COLUMN || rowIndex === HEADER_ROW
                      ? "#f5f5f5"
                      : "#fff",
                }}
              >
                {drawCell(columnIndex, rowIndex)}
              </div>
            )}
          </FixedSizeGrid>
        </div>
      )}
    </Container>
  );
}

export default App;
