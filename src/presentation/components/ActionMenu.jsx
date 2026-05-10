import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export function ActionMenu({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="action-menu-container" ref={menuRef}>
      <button
        className="action-menu-button"
        type="button"
        aria-label="Actions"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreVertical size={18} />
      </button>
      {isOpen && (
        <div className="action-menu-dropdown" onClick={(e) => e.stopPropagation()}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                onClick: (e) => {
                  setIsOpen(false);
                  if (child.props.onClick) {
                    child.props.onClick(e);
                  }
                },
              });
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
}
