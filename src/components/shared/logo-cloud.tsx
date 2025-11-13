import Image from "next/image";

export const LogoCloud = () => {
  return (
    <div>
      <div className="overflow-hidden">
        <div className="grid grid-cols-2 grid-rows-[200px] gap-px md:grid-cols-3">
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="group col-span-1 flex items-center justify-center bg-white p-16 transition-colors"
            href="https://www.cenfotur.gob.pe"
          >
            <Image
              src="/_static/logo/logo_cenfotur.svg"
              alt="CENFOTUR - Centro de Formación en Turismo"
              width={360}
              height={108}
              className="h-28 w-auto object-contain grayscale transition-all group-hover:grayscale-0"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="group col-span-1 flex items-center justify-center bg-white p-16 transition-colors"
            href="https://www.upc.edu.pe"
          >
            <Image
              src="/_static/logo/UPC_logo_transparente.png"
              alt="UPC - Universidad Peruana de Ciencias Aplicadas"
              width={360}
              height={108}
              className="h-28 w-auto object-contain grayscale transition-all group-hover:grayscale-0"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="group col-span-1 flex items-center justify-center bg-white p-16 transition-colors"
            href="#"
          >
            <Image
              src="/_static/logo/LOGOH.png"
              alt="Instituto de Gastronomía"
              width={360}
              height={108}
              className="h-28 w-auto object-contain grayscale transition-all group-hover:grayscale-0"
            />
          </a>
        </div>
      </div>
    </div>
  );
};
