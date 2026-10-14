import ResourceCard from './ResourceCard.jsx';

export default function ResourceGrid({ resources }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((r) => (
        <li key={r.resource_id}>
          <ResourceCard resource={r} />
        </li>
      ))}
    </ul>
  );
}
