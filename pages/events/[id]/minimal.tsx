export default function MinimalPage() {
  return (
    <div>
      <h1>Minimal Test Page</h1>
      <p>This page has no imports and should work</p>
    </div>
  )
}

export async function getServerSideProps() {
  return {
    props: {}
  }
}
