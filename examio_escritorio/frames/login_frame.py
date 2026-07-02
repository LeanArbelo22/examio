import customtkinter as ctk
from theme import *
from CTkMessagebox import CTkMessagebox


class LoginFrame(ctk.CTkFrame):
    def __init__(self, master, on_login_success, **kwargs):
        super().__init__(master, **kwargs)
        self.on_login_success = on_login_success
        self._build_ui()

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

        container = ctk.CTkFrame(self, fg_color=WHITE, corner_radius=CORNER_RADIUS_LG)
        container.grid(row=0, column=0)

        left = ctk.CTkFrame(container, fg_color=PRIMARY, corner_radius=CORNER_RADIUS_LG,
                            width=320, height=480)
        left.grid(row=0, column=0, sticky="ns")
        left.grid_propagate(False)

        left.grid_rowconfigure(0, weight=1)
        left.grid_columnconfigure(0, weight=1)

        brand = ctk.CTkLabel(left, text="EXAMIO", font=(FONT_FAMILY, 32, "bold"),
                             text_color=WHITE)
        brand.grid(row=0, column=0)

        right = ctk.CTkFrame(container, fg_color=WHITE, corner_radius=CORNER_RADIUS_LG,
                             width=400, height=480)
        right.grid(row=0, column=1, sticky="ns", padx=(0, 0))
        right.grid_propagate(False)

        right.grid_rowconfigure((0, 1, 2, 3, 4, 5, 6, 7), weight=0)
        right.grid_rowconfigure(8, weight=1)
        right.grid_columnconfigure(0, weight=1)
        right.grid_columnconfigure((0, 1), weight=1)

        welcome = ctk.CTkLabel(right, text="Bienvenido a EXAMIO",
                               font=(FONT_FAMILY, FONT_SIZE_XL, "bold"),
                               text_color=GRAY_900)
        welcome.grid(row=0, column=0, columnspan=2, pady=(40, 4))

        subtitle = ctk.CTkLabel(right, text="Ingresá tus credenciales para acceder",
                                font=(FONT_FAMILY, FONT_SIZE_SM), text_color=GRAY_500)
        subtitle.grid(row=1, column=0, columnspan=2, pady=(0, 24))

        ctk.CTkLabel(right, text="Identificador / Legajo",
                     font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                     text_color=GRAY_700).grid(row=2, column=0, columnspan=2, sticky="w",
                                               padx=32, pady=(0, 4))

        self.legajo_entry = ctk.CTkEntry(right, placeholder_text="Ej: DOC-001 o ALU-001",
                                         font=(FONT_FAMILY, FONT_SIZE_MD),
                                         height=40, corner_radius=CORNER_RADIUS,
                                         border_color=GRAY_300, fg_color=GRAY_50,
                                         text_color=GRAY_900)
        self.legajo_entry.grid(row=3, column=0, columnspan=2, sticky="ew", padx=32, pady=(0, 16))

        ctk.CTkLabel(right, text="Contraseña",
                     font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                     text_color=GRAY_700).grid(row=4, column=0, columnspan=2, sticky="w",
                                               padx=32, pady=(0, 4))

        self.password_entry = ctk.CTkEntry(right, placeholder_text="••••••••",
                                           font=(FONT_FAMILY, FONT_SIZE_MD),
                                           height=40, corner_radius=CORNER_RADIUS,
                                           border_color=GRAY_300, fg_color=GRAY_50,
                                           text_color=GRAY_900, show="•")
        self.password_entry.grid(row=5, column=0, columnspan=2, sticky="ew", padx=32, pady=(0, 24))

        self.login_btn = ctk.CTkButton(right, text="Ingresar a EXAMIO",
                                       font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                                       height=44, corner_radius=CORNER_RADIUS,
                                       fg_color=PRIMARY, hover_color=PRIMARY_HOVER,
                                       text_color=WHITE, command=self._handle_login)
        self.login_btn.grid(row=6, column=0, columnspan=2, sticky="ew", padx=32, pady=(0, 12))

        self.error_label = ctk.CTkLabel(right, text="", font=(FONT_FAMILY, FONT_SIZE_SM),
                                        text_color=DANGER)
        self.error_label.grid(row=7, column=0, columnspan=2, pady=(0, 8))

    def _handle_login(self):
        legajo = self.legajo_entry.get().strip()
        password = self.password_entry.get()

        if not legajo:
            self.error_label.configure(text="Ingresá tu Identificador o Legajo")
            return
        if not password:
            self.error_label.configure(text="Ingresá tu Contraseña")
            return

        self.error_label.configure(text="")
        role = "docente" if legajo.upper().startswith("DOC") else "alumno"
        self.on_login_success(role, {"legajo": legajo, "nombre": legajo})
