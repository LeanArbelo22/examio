export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className='border-t border-gray-200 bg-white py-4'>
      <div className='mx-auto max-w-7xl px-4 text-center text-sm text-gray-600'>
        © {year} Examio
      </div>
    </footer>
  );
}
