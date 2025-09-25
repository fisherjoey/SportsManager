'use client'

export default function TestWidth() {
  return (
    <div style={{ width: '100%', backgroundColor: 'red', height: '50px' }}>
      <div style={{ width: '100vw', backgroundColor: 'blue', height: '25px' }}>
        This should be full viewport width (blue)
      </div>
      <table style={{ width: '100%', border: '2px solid green' }}>
        <thead>
          <tr>
            <th>Column 1</th>
            <th>Column 2</th>
            <th>Column 3</th>
            <th>Column 4</th>
            <th>Column 5</th>
            <th>Column 6</th>
            <th>Column 7</th>
            <th>Column 8</th>
            <th>Column 9</th>
            <th>Column 10</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data that should expand to fill the entire width</td>
            <td>More data</td>
            <td>Even more data</td>
            <td>Lots of data</td>
            <td>Data everywhere</td>
            <td>So much data</td>
            <td>Data data data</td>
            <td>More and more</td>
            <td>Keep going</td>
            <td>Last column</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}