export default function SimplePage() {
  return (
    <div>
      <h1>Simple Page</h1>
      <p>No authentication, no imports, just basic HTML</p>
    </div>
  )
}

export async function getServerSideProps() {
  return {
    props: {}
  }
}
