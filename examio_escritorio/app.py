import customtkinter as ctk
from theme import *
from frames.login_frame import LoginFrame
from frames.configurar_examen_frame import ConfigurarExamenFrame
from frames.rendir_examen_frame import RendirExamenFrame


class ExamioApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("EXAMIO - Entorno de Evaluación")
        self.geometry("1200x750")
        self.minsize(900, 600)

        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("dark-blue")

        self.configure(fg_color=GRAY_50)

        self.user_data = {}
        self.current_frame = None
        self._show_login()

    def _clear(self):
        if self.current_frame:
            self.current_frame.destroy()
            self.current_frame = None

    def _show_login(self):
        self._clear()
        self.user_data = {}
        self.current_frame = LoginFrame(self, on_login_success=self._on_login)
        self.current_frame.grid(row=0, column=0, sticky="nsew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

    def _on_login(self, role, user_data):
        self.user_data = user_data
        self.user_data["role"] = role
        if role == "docente":
            self._show_configurar_examen()
        else:
            self._show_rendir_examen()

    def _show_configurar_examen(self):
        self._clear()
        self.current_frame = ConfigurarExamenFrame(
            self, on_logout=self._show_login, user_data=self.user_data
        )
        self.current_frame.grid(row=0, column=0, sticky="nsew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)

    def _show_rendir_examen(self, exam_config=None):
        self._clear()
        config = exam_config or {
            "titulo": "Parcial 1 - Análisis Matemático",
            "catedra": "Análisis Matemático I — Cátedra García",
            "duracion_minutos": 30,
        }
        self.current_frame = RendirExamenFrame(
            self, on_logout=self._show_login, user_data=self.user_data,
            exam_config=config
        )
        self.current_frame.grid(row=0, column=0, sticky="nsew")
        self.grid_rowconfigure(0, weight=1)
        self.grid_columnconfigure(0, weight=1)
