import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeGrid } from "react-window";
import "./App.css";
import ResizeObserver from "resize-observer-polyfill";
import { hash_encoded_js, create_default_config } from "rust-argon2-wasm";

const MIN_MEMORY = 1024;
const MIN_ITERATIONS = 1;
const MIN_PARALLELISM = 1;
const DEFAULT_VARIANT = "Argon2id";
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
  const [argon2Params, setArgon2Params] = useState({
    memory: MIN_MEMORY,
    iterations: MIN_ITERATIONS,
    parallelism: MIN_PARALLELISM,
    variant: DEFAULT_VARIANT,
  });

  const [runningParams, setRunningParams] = useState({
    ...argon2Params,
    currentIteration: 1,
  });
  const [started, setStarted] = useState(false);

  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0 });

  const setArgon2Param = (param, value) => {
    setArgon2Params({ ...argon2Params, [param]: value });
  };

  const setRunningParam = (param, value) => {
    setRunningParams({ ...runningParams, [param]: value });
  };

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

  const startAlgorithm = (e, params) => {
    e.preventDefault();
    setRunningParams({ ...params, currentIteration: 1 });
    setStarted(true);
    const config = JSON.stringify({
      ...JSON.parse(create_default_config()),
      memory: params.memory.toString(),
      iterations: params.iterations.toString(),
      parallelism: params.parallelism.toString(),
      variant: params.variant,
    });

    console.log(JSON.parse(hash_encoded_js("password", "salt11bytes", config)));
  };

  return (
    <Container ref={containerRef} className="mt-4">
      <h1 className="text-center">Argon2 Visualizer</h1>
      <Form onSubmit={(e) => startAlgorithm(e, argon2Params)}>
        <Form.Group className="mb-3">
          <Form.Label>Argon2 Variant</Form.Label>
          <Form.Select
            value={argon2Params.variant}
            onChange={(e) => setArgon2Param("variant", e.target.value)}
          >
            <option value="Argon2i">Argon2i</option>
            <option value="Argon2d">Argon2d</option>
            <option value="Argon2id">Argon2id</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Memory (KB)</Form.Label>
          <Form.Control
            type="number"
            min={MIN_MEMORY}
            placeholder="Memory"
            value={argon2Params.memory}
            onChange={(e) => setArgon2Param("memory", Number(e.target.value))}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Iterations</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Iterations"
            value={argon2Params.iterations}
            onChange={(e) =>
              setArgon2Param("iterations", Number(e.target.value))
            }
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Parallelism</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Parallelism"
            value={argon2Params.parallelism}
            onChange={(e) =>
              setArgon2Param("parallelism", Number(e.target.value))
            }
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>

      {started && (
        <div>
          <IterationControls
            runningParams={runningParams}
            setRunningParam={setRunningParam}
          />
          <MemoryTable
            runningParams={runningParams}
            width={containerDimensions?.width}
          />
        </div>
      )}
    </Container>
  );
}

export default App;

const IterationControls = (props) => {
  const { runningParams, setRunningParam } = props;

  const hasNextIteration = useMemo(
    () => runningParams.currentIteration < runningParams.iterations,
    [runningParams.currentIteration, runningParams.iterations]
  );
  const hasPreviousIteration = useMemo(
    () => runningParams.currentIteration > 1,
    [runningParams.currentIteration]
  );

  return (
    <>
      <p>Current Iteration: {runningParams.currentIteration}</p>
      <Button
        disabled={!hasPreviousIteration}
        onClick={() =>
          setRunningParam(
            "currentIteration",
            runningParams.currentIteration - 1
          )
        }
      >
        Previous
      </Button>
      <Button
        disabled={!hasNextIteration}
        onClick={() =>
          setRunningParam(
            "currentIteration",
            runningParams.currentIteration + 1
          )
        }
      >
        Next
      </Button>
    </>
  );
};

const MemoryTable = (props) => {
  const { runningParams, width } = props;

  const q = useMemo(
    () => Math.floor(runningParams.memory / runningParams.parallelism),
    [runningParams.memory, runningParams.parallelism]
  );

  const rowCount = useMemo(
    () => runningParams.parallelism + 1,
    [runningParams.parallelism]
  );

  const columnCount = useMemo(() => q + 1, [q]);

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
    if (runningParams.currentIteration === 1) {
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
    <>
      <h4 className="my-4">Memory Table</h4>
      <FixedSizeGrid
        columnCount={columnCount}
        rowCount={rowCount}
        height={300}
        width={width}
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
    </>
  );
};
